import "dotenv/config";
import connectDB, { sequelize } from "../config/db.js";
import Category from "../model/categoryModel.js";
import Product from "../model/productModel.js";
import { toSlug } from "../utils/helpers.js";

/**
 * Seeds the storefront catalog with the same décor categories/products the
 * homepage currently renders from hardcoded data (frontend/src/utils/site.js
 * DECOR_CATEGORIES + FEATURED_PRODUCTS), so /products, /product/:id and the
 * admin Categories/Products screens show real, matching data.
 *
 * Idempotent: matches on slug and upserts, never duplicates. Any category or
 * product left over from an older, unrelated seed run (mismatched furniture
 * placeholder data) is removed first so the catalog reflects only what's
 * actually on the storefront.
 *
 *   npm run seed:demo
 */

const unsplash = (id, w = 900) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const CATEGORIES = [
  { name: "Wall Décor", image: unsplash("photo-1534349762230-e0cadf78f5da", 400), description: "Statement wall art, prints and décor panels." },
  { name: "Clocks", image: unsplash("photo-1590587754330-6fc06e3a9bb7", 400), description: "Wall and table clocks in modern and classic styles." },
  { name: "Sculptures", image: unsplash("photo-1617596223856-a17ba0eac50b", 400), description: "Sculptural showpieces for shelves and console tables." },
  { name: "Showpieces", image: unsplash("photo-1701594446784-c73dc5e89050", 400), description: "Curated showpieces and decorative accents." },
  { name: "Table Décor", image: unsplash("photo-1559373098-518914f1c315", 400), description: "Side tables and tabletop décor pieces." },
  { name: "Decorative Accessories", image: unsplash("photo-1572048572872-2394404cf1f3", 400), description: "Planters, trays and other decorative accessories." },
  { name: "Home Décor", image: unsplash("photo-1554995207-c18c203602cb", 400), description: "Statement furniture and home décor pieces." },
  { name: "New Arrivals", image: unsplash("photo-1640246944367-89e6a3eeab74", 400), description: "The latest pieces added to the collection." },
  { name: "Table Lamps & Lighting", image: unsplash("photo-1580130281320-0ef0754f2bf7", 400), description: "Floor and table lamps to light up any room." },
  { name: "Decorative Mirrors", image: unsplash("photo-1612392549429-a874f09c65f1", 400), description: "Wall mirrors in a range of shapes and finishes." },
];

const PRODUCT_SEED = [
  // [name, category, price, discountPrice, stock, sku, tags, image, isFeatured, isBestseller, isNewArrival]
  ["Velvet Tufted Accent Chair", "Home Décor", 18999, 14999, 14, "HD-VTA-001", ["accent-chair", "velvet"], "photo-1567538096630-e0c55bd6374c", true, true, false],
  ["Marigold Lounge Chair", "Home Décor", 21499, 0, 9, "HD-MLC-002", ["lounge-chair"], "photo-1586023492125-27b2c045efd7", true, false, true],
  ["Boucle Two-Seater Sofa", "Home Décor", 42999, 36999, 6, "HD-BTS-003", ["sofa", "boucle"], "photo-1493663284031-b7e3aefcae8e", true, true, false],
  ["Reclaimed Wood Side Table", "Table Décor", 8499, 0, 20, "TD-RWS-004", ["side-table", "wood"], "photo-1519710164239-da123dc03ef4", true, false, false],
  ["Round Rattan Wall Mirror Duo", "Decorative Mirrors", 6999, 5499, 16, "DM-RRM-005", ["mirror", "rattan"], "photo-1631679706909-1844bbd07221", true, false, true],
  ["Wooden Wall Clock", "Clocks", 3499, 0, 25, "CL-WWC-006", ["clock", "wood"], "photo-1533090161767-e6ffed986c88", true, false, false],
  ["Line-Art Print Set of 2", "Wall Décor", 2999, 2299, 30, "WD-LAP-007", ["wall-art", "print"], "photo-1586105251261-72a756497a11", true, false, false],
  ["Matte Arc Floor Lamp", "Table Lamps & Lighting", 11999, 0, 11, "TL-MAF-008", ["floor-lamp"], "photo-1507473885765-e6ed057f782c", true, true, false],
  ["Ceramic Planter Pot", "Decorative Accessories", 1499, 1199, 40, "DA-CPP-009", ["planter", "ceramic"], "photo-1485955900006-10f4d324d411", true, false, false],
  ["Scented Glass Jar Candle", "Showpieces", 1299, 0, 35, "SP-SGJ-010", ["candle"], "photo-1602874801007-bd458bb1b8b6", true, false, true],
  ["Abstract Bronze Sculpture", "Sculptures", 15999, 12999, 8, "SC-ABS-011", ["sculpture", "bronze"], "photo-1617596223856-a17ba0eac50b", false, false, false],
  ["Woven Storage Basket", "New Arrivals", 2199, 0, 22, "NA-WSB-012", ["storage", "woven"], "photo-1640246944367-89e6a3eeab74", false, false, true],
];

const upsertCategory = async ({ name, description, image }) => {
  const slug = toSlug(name);
  const [category] = await Category.findOrCreate({
    where: { slug },
    defaults: { name, slug, description, image, isActive: true },
  });
  category.name = name;
  category.description = description;
  category.image = image;
  category.isActive = true;
  await category.save();
  return category;
};

const upsertProduct = async (categoryByName, seed) => {
  const [name, categoryName, price, discountPrice, stock, sku, tags, imageId, isFeatured, isBestseller, isNewArrival] = seed;
  const category = categoryByName.get(categoryName);
  if (!category) return null;

  const slug = toSlug(name);
  const images = [unsplash(imageId, 900), unsplash(imageId, 600)];

  const [product] = await Product.findOrCreate({
    where: { slug },
    defaults: {
      name,
      slug,
      sku,
      category: category.id,
      description: `${name} — part of the One Square Associates home décor collection.`,
      price,
      discountPrice,
      currency: "INR",
      stock,
      images,
      tags,
      isFeatured,
      isBestseller,
      isTrending: false,
      isNewArrival,
      status: "active",
      isPublished: true,
      deliveryEstimate: "5-7 business days",
    },
  });

  product.category = category.id;
  product.price = price;
  product.discountPrice = discountPrice;
  product.stock = stock;
  product.tags = tags;
  product.images = images;
  product.isFeatured = isFeatured;
  product.isBestseller = isBestseller;
  product.isNewArrival = isNewArrival;
  product.status = "active";
  product.isPublished = true;
  await product.save();
  return product;
};

const run = async () => {
  await connectDB();

  const keepSlugs = new Set(CATEGORIES.map((c) => toSlug(c.name)));
  const stale = await Category.findAll({ where: {} });
  const staleToRemove = stale.filter((c) => !keepSlugs.has(c.slug));
  if (staleToRemove.length) {
    const staleIds = staleToRemove.map((c) => c.id);
    console.log(`[demo] removing ${staleToRemove.length} stale category/product set(s) from an older seed...`);
    await Product.destroy({ where: { category: staleIds } });
    await Category.destroy({ where: { id: staleIds } });
  }

  console.log("[demo] upserting categories...");
  const categories = [];
  for (const c of CATEGORIES) categories.push(await upsertCategory(c));
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  console.log("[demo] upserting products...");
  let count = 0;
  for (const seed of PRODUCT_SEED) {
    const p = await upsertProduct(categoryByName, seed);
    if (p) count += 1;
  }

  console.log(`[demo] done — ${categories.length} categories, ${count} products.`);
  await sequelize.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[demo] failed:", error.message);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
