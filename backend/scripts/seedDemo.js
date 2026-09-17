import "dotenv/config";
import connectDB, { sequelize } from "../config/db.js";
import Category from "../model/categoryModel.js";
import Product from "../model/productModel.js";
import { toSlug } from "../utils/helpers.js";

/**
 * Seeds the storefront catalog (furniture categories + products) so /shop
 * and the homepage have real data to render. Idempotent: matches on slug and
 * upserts, never duplicates. Product photos are Lorem Picsum placeholders —
 * swap them for real photos from Admin → Products once available.
 *
 *   npm run seed:demo
 */

const placeholderImage = (seed) => `https://picsum.photos/seed/${seed}/900/700`;

const CATEGORIES = [
  { name: "Sofas", description: "3-seater, L-shape and Chesterfield sofas for every living room." },
  { name: "Recliners", description: "Manual and motorised recliners in leatherette and fabric." },
  { name: "Chairs", description: "Wing chairs, lounge chairs and accent seating." },
  { name: "Living Room", description: "Coffee tables, TV units and living room furniture." },
  { name: "Bedroom", description: "Beds, benches and bedroom storage furniture." },
  { name: "Kids Furniture", description: "Playful, safe furniture sized for children." },
];

const PRODUCT_SEED = [
  // [name, category, price, discountPrice, stock, sku, tags, isFeatured, isBestseller, isNewArrival]
  ["Chesterfield 3-Seater Sofa", "Sofas", 68500, 58200, 12, "SF-CHS-3S", ["chesterfield", "velvet"], true, true, false],
  ["L-Shape Sectional Sofa — Charcoal", "Sofas", 82100, 71400, 8, "SF-LSH-CH", ["l-shape", "sectional"], true, true, false],
  ["Button-Tufted Signature Sofa", "Sofas", 54200, 45200, 15, "SF-SIG-004", ["signature", "tufted"], false, true, false],
  ["Compact 2-Seater Loveseat", "Sofas", 32900, 27900, 20, "SF-LOV-2S", ["compact", "loveseat"], false, false, true],
  ["Sofa-cum-Bed — Grey Weave", "Sofas", 41500, 35900, 10, "SF-BED-GY", ["sofa-bed", "space-saving"], false, false, true],

  ["Single Motorised Recliner", "Recliners", 63700, 54900, 14, "RC-MOT-1S", ["motorised", "leatherette"], true, true, false],
  ["Manual 2-Seater Recliner Sofa", "Recliners", 48900, 41200, 9, "RC-MAN-2S", ["manual", "fabric"], false, true, false],
  ["3-Seater Rocker Recliner", "Recliners", 58400, 49900, 6, "RC-ROC-3S", ["rocker", "family"], false, false, false],
  ["Glider Recliner — Tan Leatherette", "Recliners", 22499, 18999, 25, "RC-GLD-TN", ["glider", "compact"], false, false, true],

  ["Wing Back Accent Chair", "Chairs", 18400, 15900, 18, "CH-WNG-01", ["wingback", "accent"], false, true, false],
  ["King Chair — Solid Wood", "Chairs", 28400, 24500, 7, "CH-KNG-WD", ["king-chair", "statement"], true, false, false],
  ["Lounge Chair with Ottoman", "Chairs", 24900, 21200, 11, "CH-LNG-OT", ["lounge", "ottoman"], false, false, true],
  ["Rattan Accent Chair", "Chairs", 12900, 10999, 22, "CH-RTN-01", ["rattan", "outdoor"], false, false, false],

  ["Solid Wood Coffee Table", "Living Room", 15600, 13400, 16, "LR-CFT-SW", ["coffee-table", "wood"], false, false, false],
  ["TV Console Unit — Walnut", "Living Room", 21400, 18200, 10, "LR-TVU-WN", ["tv-unit", "storage"], true, false, false],
  ["Nesting Side Table Set (2pc)", "Living Room", 8900, 7499, 30, "LR-NST-2P", ["side-table", "set"], false, false, true],

  ["Upholstered Bed Frame — King", "Bedroom", 45200, 38900, 8, "BR-BED-KG", ["upholstered", "king"], true, true, false],
  ["Bedroom Storage Bench", "Bedroom", 11400, 9799, 20, "BR-BNC-01", ["bench", "storage"], false, false, false],
  ["Bedside Table — Set of 2", "Bedroom", 9600, 8299, 24, "BR-BST-2P", ["bedside", "set"], false, false, false],

  ["Unicorn Kids Armchair", "Kids Furniture", 9499, 7999, 19, "KD-UNI-AC", ["kids", "unicorn"], true, false, true],
  ["Kids Study Table & Chair Set", "Kids Furniture", 13200, 11400, 14, "KD-STD-01", ["kids", "study"], false, false, true],
];

const upsertCategory = async ({ name, description }) => {
  const slug = toSlug(name);
  const [category] = await Category.findOrCreate({
    where: { slug },
    defaults: { name, slug, description, image: placeholderImage(slug), isActive: true },
  });
  category.name = name;
  category.description = description;
  category.isActive = true;
  if (!category.image) category.image = placeholderImage(slug);
  await category.save();
  return category;
};

const upsertProduct = async (categoryByName, seed) => {
  const [name, categoryName, price, discountPrice, stock, sku, tags, isFeatured, isBestseller, isNewArrival] = seed;
  const category = categoryByName.get(categoryName);
  if (!category) return null;

  const slug = toSlug(name);
  const images = [0, 1].map((i) => placeholderImage(`${slug}-${i}`));

  const [product] = await Product.findOrCreate({
    where: { slug },
    defaults: {
      name,
      slug,
      sku,
      category: category.id,
      description: `${name} from the One Square Associates furniture collection.`,
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
      deliveryEstimate: "7-10 business days",
    },
  });

  product.category = category.id;
  product.price = price;
  product.discountPrice = discountPrice;
  product.stock = stock;
  product.tags = tags;
  product.isFeatured = isFeatured;
  product.isBestseller = isBestseller;
  product.isNewArrival = isNewArrival;
  product.status = "active";
  product.isPublished = true;
  if (!product.images || !product.images.length) product.images = images;
  await product.save();
  return product;
};

const run = async () => {
  await connectDB();

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
