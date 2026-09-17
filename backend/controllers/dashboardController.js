import { Op, fn, col } from "sequelize";
import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import User, { STAFF_ROLES } from "../model/userModel.js";
import Category from "../model/categoryModel.js";
import { buildDaySeries, dayKey, pct, round2, startOfDay, toNum } from "../utils/helpers.js";

/* Colours ship WITH the data, so the frontend never maps a label to a colour. */
const STATUS_COLORS = {
  delivered: "#059669",
  shipped: "#2563eb",
  in_transit: "#0891b2",
  confirmed: "#d97706",
  pending: "#f59e0b",
  cancelled: "#dc2626",
};
const PAYMENT_COLORS = [
  "#2563eb",
  "#0f766e",
  "#0891b2",
  "#d97706",
  "#A0764B",
  "#7c3aed",
  "#94a3b8",
];
const CATEGORY_COLORS = ["#1e3a8a", "#2563eb", "#60a5fa", "#0891b2", "#0f766e", "#94a3b8"];
const INV_COLORS = ["#A0764B", "#C6884B", "#d97706", "#dc2626", "#0f766e", "#2563eb"];
const FUNNEL_COLORS = {
  "Orders Placed": "#2563eb",
  Confirmed: "#0891b2",
  Shipped: "#A0764B",
  "In Transit": "#0f766e",
  Delivered: "#059669",
};

const STATUS_LABEL = {
  confirmed: "Confirmed",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Count rows per local day.
 * Bucketing happens in JS (not a SQL date function) so every series in this
 * response uses the SAME day boundary as `dayKey` — otherwise the chart
 * columns drift against each other by a timezone offset.
 */
const countByDay = async (Model, since, where = {}) => {
  const rows = await Model.findAll({
    where: { createdAt: { [Op.gte]: since }, ...where },
    attributes: ["createdAt"],
    raw: true,
  });
  const map = new Map();
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
};

// GET /api/admin/dashboard/stats?range=7|14|30
export const getDashboardStats = async (req, res) => {
  try {
    const range = [7, 14, 30].includes(Math.trunc(toNum(req.query.range, 14)))
      ? Math.trunc(toNum(req.query.range, 14))
      : 14;

    const now = new Date();
    const windowStart = startOfDay(new Date(now.getTime() - (range - 1) * 86400000));
    const prevStart = startOfDay(new Date(windowStart.getTime() - range * 86400000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const series = buildDaySeries(range, now);

    const [
      curOrders,
      prevOrders,
      curCustomers,
      prevCustomers,
      curProducts,
      prevProducts,
      totalProducts,
      featuredProducts,
      availableNow,
      teamMembers,
      activeCustomers,
    ] = await Promise.all([
      Order.findAll({
        where: { createdAt: { [Op.gte]: windowStart } },
        attributes: ["id", "total", "createdAt", "user", "status", "paymentMethod", "cardBrand", "items"],
        raw: true,
      }),
      Order.findAll({
        where: { createdAt: { [Op.gte]: prevStart, [Op.lt]: windowStart } },
        attributes: ["total", "createdAt"],
        raw: true,
      }),
      User.count({ where: { role: "user", isDeleted: { [Op.ne]: true }, createdAt: { [Op.gte]: windowStart } } }),
      User.count({
        where: {
          role: "user",
          isDeleted: { [Op.ne]: true },
          createdAt: { [Op.gte]: prevStart, [Op.lt]: windowStart },
        },
      }),
      Product.count({ where: { isDeleted: { [Op.ne]: true }, createdAt: { [Op.gte]: windowStart } } }),
      Product.count({
        where: { isDeleted: { [Op.ne]: true }, createdAt: { [Op.gte]: prevStart, [Op.lt]: windowStart } },
      }),
      Product.count({ where: { isDeleted: { [Op.ne]: true } } }),
      Product.count({ where: { isDeleted: { [Op.ne]: true }, isFeatured: true } }),
      Product.count({ where: { isDeleted: { [Op.ne]: true }, status: "active", stock: { [Op.gt]: 0 } } }),
      User.count({ where: { role: { [Op.in]: STAFF_ROLES }, isActive: true } }),
      User.count({ where: { role: "user", isDeleted: { [Op.ne]: true }, customerStatus: "active" } }),
    ]);

    /* ---------------------------------------------------------------- KPIs */
    const curRevenue = round2(curOrders.reduce((s, o) => s + (o.total || 0), 0));
    const prevRevenue = round2(prevOrders.reduce((s, o) => s + (o.total || 0), 0));
    const avgOrder = curOrders.length ? round2(curRevenue / curOrders.length) : 0;
    const prevAvgOrder = prevOrders.length ? round2(prevRevenue / prevOrders.length) : 0;

    /* ---------------------------------------------- day series (no holes) */
    const revenueMap = new Map();
    const orderCountMap = new Map();
    for (const o of curOrders) {
      const k = dayKey(o.createdAt);
      revenueMap.set(k, round2((revenueMap.get(k) || 0) + (o.total || 0)));
      orderCountMap.set(k, (orderCountMap.get(k) || 0) + 1);
    }

    const [productDayMap, customerDayMap] = await Promise.all([
      countByDay(Product, windowStart, { isDeleted: { [Op.ne]: true } }),
      countByDay(User, windowStart, { role: "user", isDeleted: { [Op.ne]: true } }),
    ]);

    const revenueByDay = series.map((d) => revenueMap.get(d.key) || 0);
    const ordersByDay = series.map((d) => orderCountMap.get(d.key) || 0);
    const productsByDay = series.map((d) => productDayMap.get(d.key) || 0);
    const customersByDay = series.map((d) => customerDayMap.get(d.key) || 0);

    /* ------------------------------------------------------- weekly sales */
    const weekStart = startOfDay(new Date(now.getTime() - 6 * 86400000));
    const weekly = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const k = dayKey(d);
      weekly.push({
        day: DAY_LABELS[d.getDay()],
        value: round2(revenueMap.get(k) || 0),
        orders: orderCountMap.get(k) || 0,
      });
    }

    /* -------------------------------------------------- order status donut */
    const monthStatusRows = await Order.findAll({
      where: { createdAt: { [Op.gte]: monthStart } },
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      raw: true,
    });
    const monthStatus = monthStatusRows.map((r) => ({ _id: r.status, count: Number(r.count) }));
    const monthTotal = monthStatus.reduce((s, r) => s + r.count, 0);
    const orderStatus = monthStatus.map((r) => ({
      name: STATUS_LABEL[r._id] || r._id,
      value: monthTotal ? round2((r.count / monthTotal) * 100) : 0,
      count: r.count,
      color: STATUS_COLORS[r._id] || "#94a3b8",
    }));

    /* ---------------------------------------------- fulfillment funnel */
    const [placed, confirmedPlus, shippedPlus, transitPlus, deliveredCount] = await Promise.all([
      Order.count(),
      Order.count({ where: { status: { [Op.in]: ["confirmed", "shipped", "in_transit", "delivered"] } } }),
      Order.count({ where: { status: { [Op.in]: ["shipped", "in_transit", "delivered"] } } }),
      Order.count({ where: { status: { [Op.in]: ["in_transit", "delivered"] } } }),
      Order.count({ where: { status: "delivered" } }),
    ]);
    const fulfillmentFunnel = [
      { stage: "Orders Placed", value: placed },
      { stage: "Confirmed", value: confirmedPlus },
      { stage: "Shipped", value: shippedPlus },
      { stage: "In Transit", value: transitPlus },
      { stage: "Delivered", value: deliveredCount },
    ].map((s) => ({ ...s, color: FUNNEL_COLORS[s.stage] }));

    /* -------------------------------------------- new vs returning buyers */
    const firstOrderRows = await Order.findAll({
      attributes: ["user", [fn("MIN", col("createdAt")), "firstAt"]],
      group: ["user"],
      raw: true,
    });
    const firstOrderMap = new Map(firstOrderRows.map((r) => [String(r.user), dayKey(r.firstAt)]));

    const newMap = new Map();
    const retMap = new Map();
    for (const o of curOrders) {
      const k = dayKey(o.createdAt);
      const isNew = firstOrderMap.get(String(o.user)) === k;
      const target = isNew ? newMap : retMap;
      target.set(k, (target.get(k) || 0) + 1);
    }
    const newCustomers = series.map((d) => newMap.get(d.key) || 0);
    const returningCustomers = series.map((d) => retMap.get(d.key) || 0);
    const newTotal = newCustomers.reduce((a, b) => a + b, 0);
    const returningTotal = returningCustomers.reduce((a, b) => a + b, 0);

    /* ----------------------------------------------------- payment methods */
    const payRows = await Order.findAll({
      where: { createdAt: { [Op.gte]: windowStart } },
      attributes: [
        [fn("COALESCE", col("cardBrand"), "other"), "brand"],
        [fn("SUM", col("total")), "amount"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: ["brand"],
      order: [[fn("SUM", col("total")), "DESC"]],
      limit: 7,
      raw: true,
    });
    const payTotal = payRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const paymentMethods = payRows.map((r, i) => ({
      name: String(r.brand || "other").replace(/^\w/, (c) => c.toUpperCase()),
      value: payTotal ? round2((Number(r.amount) / payTotal) * 100) : 0,
      amount: round2(r.amount),
      count: Number(r.count),
      color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
    }));

    /* -------------------------------------------------------- top categories */
    const windowOrders = await Order.findAll({
      where: { createdAt: { [Op.gte]: windowStart } },
      attributes: ["items"],
      raw: true,
    });
    const productIds = new Set();
    for (const o of windowOrders) {
      for (const item of o.items || []) if (item.product) productIds.add(String(item.product));
    }
    const productsById = new Map(
      (
        await Product.findAll({ where: { id: [...productIds] }, attributes: ["id", "category"], raw: true })
      ).map((p) => [String(p.id), p.category])
    );
    const salesByCategory = new Map();
    for (const o of windowOrders) {
      for (const item of o.items || []) {
        const categoryId = productsById.get(String(item.product));
        if (!categoryId) continue;
        const sales = (item.price || 0) * (item.quantity || 0);
        salesByCategory.set(categoryId, (salesByCategory.get(categoryId) || 0) + sales);
      }
    }
    const catRows = [...salesByCategory.entries()]
      .map(([id, sales]) => ({ _id: id, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    const catNames = await Category.findAll({
      where: { id: catRows.map((c) => c._id) },
      attributes: ["id", "name"],
      raw: true,
    });
    const catNameMap = new Map(catNames.map((c) => [String(c.id), c.name]));
    const catTotal = catRows.reduce((s, r) => s + r.sales, 0);
    const topCategories = catRows.map((r, i) => ({
      name: catNameMap.get(String(r._id)) || "Uncategorised",
      value: catTotal ? round2((r.sales / catTotal) * 100) : 0,
      sales: round2(r.sales),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    /* ------------------------------------------------------ inventory health */
    const invRows = await Product.findAll({
      where: { isDeleted: { [Op.ne]: true } },
      attributes: ["name", "stock", "lowStockThreshold"],
      order: [["stock", "ASC"]],
      limit: 5,
      raw: true,
    });
    const inventoryHealth = invRows.map((p, i) => ({
      name: p.name,
      inStock: p.stock || 0,
      reorder: p.lowStockThreshold ?? 10,
      color: INV_COLORS[i % INV_COLORS.length],
    }));

    /* ------------------------------------------------------------ response */
    return res.status(200).json({
      range,
      kpis: {
        totalRevenue: curRevenue,
        revenueDelta: pct(curRevenue, prevRevenue),
        totalOrders: curOrders.length,
        ordersDelta: pct(curOrders.length, prevOrders.length),
        totalProducts,
        productsNewThis: curProducts,
        productsDelta: pct(curProducts, prevProducts),
        activeCustomers,
        customersDelta: pct(curCustomers, prevCustomers),
        avgOrder,
        avgOrderDelta: pct(avgOrder, prevAvgOrder),
      },
      sparklines: {
        revenue: revenueByDay,
        orders: ordersByDay,
        products: productsByDay,
        customers: customersByDay,
      },
      miniStats: {
        featuredProducts,
        availableNow,
        lowStock: inventoryHealth.filter((i) => i.inStock <= i.reorder).length,
        teamMembers,
      },
      revenueByDay,
      revenueLabels: series.map((d) => d.key),
      revenueSummary: {
        total: curRevenue,
        avgOrder,
        completion: placed ? round2((deliveredCount / placed) * 100) : 0,
      },
      weeklySales: weekly,
      orderStatus,
      fulfillmentFunnel,
      customerAcquisition: {
        newCustomers,
        returningCustomers,
        newTotal,
        returningTotal,
        retention:
          newTotal + returningTotal > 0
            ? round2((returningTotal / (newTotal + returningTotal)) * 100)
            : 0,
      },
      paymentMethods,
      topCategories,
      inventoryHealth,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
