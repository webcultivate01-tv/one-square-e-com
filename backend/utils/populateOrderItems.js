import Product from "../model/productModel.js";

/**
 * Order.items is a JSON blob (no real FK), so "populating" item.product the way
 * Mongoose did means a second lookup: collect every productId referenced across
 * the given orders, fetch those products once, then splice the info back in.
 */
export const attachItemProducts = async (orders, attributes = ["id", "name", "images"]) => {
  const ids = new Set();
  for (const o of orders) {
    for (const item of o.items || []) {
      if (item?.product) ids.add(String(item.product));
    }
  }
  if (!ids.size) return orders;

  const rows = await Product.findAll({ where: { id: [...ids] }, attributes });
  const map = new Map(rows.map((p) => [String(p.id), { _id: p.id, ...p.toJSON() }]));

  for (const o of orders) {
    for (const item of o.items || []) {
      if (item?.product && map.has(String(item.product))) {
        item.productDetails = map.get(String(item.product));
      }
    }
  }
  return orders;
};

export default attachItemProducts;
