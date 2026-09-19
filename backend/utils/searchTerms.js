import { Op } from "sequelize";
import { likeTerm } from "./helpers.js";

/**
 * Multi-language product search.
 *
 * Each concept lists the English terms that exist in the catalog (`en`) and the
 * ways a shopper may say it in other languages (`alias`): Devanagari script
 * (Marathi / Hindi) and romanised spellings (Ghadyal, Khurchi, ...).
 *
 * Matching runs in layers, cheapest first:
 *   1. exact / prefix match on the raw alias (works for Devanagari + English)
 *   2. phonetic "skeleton" match for romanised input (ghadya ~ ghadyal ~ ghadiyal)
 *   3. typo tolerance (edit distance 1) on the skeleton
 * The original text is always searched too, so plain English keeps working.
 */
const CONCEPTS = [
  { en: ["clock", "timer", "watch"], alias: ["ghadyal", "ghadi", "ghadiyal", "gadi", "ghadyaal", "घड्याळ", "घडी", "घड़ी", "घडयाळ", "टायमर"] },
  { en: ["chair", "stool"], alias: ["khurchi", "kursi", "khurshi", "khuchi", "खुर्ची", "कुर्सी", "स्टूल"] },
  { en: ["table", "desk"], alias: ["mej", "meja", "maij", "tebal", "टेबल", "मेज", "मेज़"] },
  { en: ["sofa", "couch", "settee"], alias: ["sofa", "sophaa", "soffa", "सोफा", "कोच"] },
  { en: ["bed", "cot"], alias: ["palang", "palng", "khat", "khaat", "khatiya", "bistar", "पलंग", "खाट", "बिस्तर", "खटिया"] },
  { en: ["wardrobe", "cupboard", "almirah", "cabinet"], alias: ["kapat", "kapaat", "almari", "alamari", "almirah", "cupboard", "कपाट", "कपाटे", "अलमारी", "कपबोर्ड"] },
  { en: ["shelf", "rack", "bookcase", "bookshelf"], alias: ["maandani", "mandani", "rack", "shelf", "thak", "मांडणी", "मांडणी", "रॅक", "रैक", "शेल्फ", "अलमारी"] },
  { en: ["lamp", "light", "lantern", "chandelier"], alias: ["diva", "deeva", "dipa", "deep", "batti", "bati", "roshni", "divaa", "दिवा", "दिवे", "दीप", "बत्ती", "दीया", "दिया", "रोशनी", "कंदील", "झुंबर"] },
  { en: ["mirror"], alias: ["aarsa", "arsa", "aarasa", "aaina", "aina", "aayna", "आरसा", "आरशी", "आईना", "आइना", "दर्पण"] },
  { en: ["curtain", "drape", "blind"], alias: ["pardaa", "parda", "padda", "pade", "पडदा", "पडदे", "परदा", "पर्दा", "पर्दे"] },
  { en: ["carpet", "rug", "mat"], alias: ["galicha", "gaalicha", "kaleen", "kalin", "chatai", "गालिचा", "गालीचा", "कालीन", "चटई", "जाजम"] },
  { en: ["vase", "pot", "planter"], alias: ["phuldani", "fuldani", "phooldan", "phooldani", "gamla", "kundi", "फुलदाणी", "फूलदान", "गमला", "कुंडी"] },
  { en: ["frame", "photo frame", "painting", "art", "canvas", "poster"], alias: ["chitra", "chitr", "tasveer", "tasvir", "fram", "photo", "चित्र", "तस्वीर", "फोटो", "फ्रेम", "पेंटिंग"] },
  { en: ["showpiece", "decor", "decoration", "sculpture", "figurine", "statue"], alias: ["shobha", "sajavat", "sajawat", "sajaavat", "murti", "moorti", "shobhechi", "शोभा", "सजावट", "सजावटी", "मूर्ती", "मूर्ति", "शोपीस"] },
  { en: ["plant", "greenery", "flower"], alias: ["zad", "jhad", "ropa", "paudha", "phool", "ful", "फूल", "फुल", "झाड", "रोप", "पौधा"] },
  { en: ["wooden", "wood", "teak"], alias: ["lakdi", "lakadi", "lakri", "sagwan", "lakdache", "लाकूड", "लाकडी", "लकडी", "लकड़ी", "सागवान"] },
  { en: ["wall"], alias: ["bhint", "bhinti", "deewar", "diwar", "diwaar", "भिंत", "भिंती", "दीवार", "दिवार"] },
  { en: ["gift", "hamper"], alias: ["bhet", "bhetvastu", "tohfa", "uphar", "upahar", "भेट", "भेटवस्तू", "तोहफा", "उपहार", "गिफ्ट"] },
  { en: ["basket", "storage", "box"], alias: ["tokri", "topli", "dabba", "peti", "टोपली", "टोकरी", "डबा", "डब्बा", "पेटी"] },
  { en: ["stand", "holder", "tray"], alias: ["stand", "thali", "tray", "स्टँड", "स्टैंड", "ताट", "थाली", "ट्रे"] },
  { en: ["candle"], alias: ["mezbatti", "mombatti", "mombati", "मेणबत्ती", "मोमबत्ती"] },
];

const DEVANAGARI = /[ऀ-ॿ]/;

/** Consonant skeleton so spelling / vowel-length variants collapse to one key. */
const skeleton = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/ph/g, "f")
    .replace(/[ckq]/g, "k")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/h/g, "")
    .replace(/[aeiou]/g, "")
    .replace(/(.)\1+/g, "$1");

const editDistanceAtMostOne = (a, b) => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
};

// Pre-compute skeletons once for the romanised aliases.
const INDEX = CONCEPTS.map((c) => ({
  en: c.en,
  native: c.alias.filter((a) => DEVANAGARI.test(a)),
  roman: [...new Set(c.alias.filter((a) => !DEVANAGARI.test(a)).map(skeleton).filter(Boolean))],
  englishKeys: c.en.map((e) => e.toLowerCase()),
}));

const matchesConcept = (token, entry) => {
  const t = token.toLowerCase();
  if (entry.englishKeys.includes(t)) return true;

  if (DEVANAGARI.test(t)) {
    return entry.native.some(
      (a) => t === a || (t.length >= 3 && t.startsWith(a) && a.length >= 2) || (t.length >= 3 && a.startsWith(t))
    );
  }

  const key = skeleton(t);
  if (!key) return false;
  return entry.roman.some((k) => {
    if (key === k) return true;
    if (key.length >= 3 && k.startsWith(key)) return true; // partial typing: "ghadya"
    if (k.length >= 3 && key.startsWith(k) && key.length - k.length <= 1) return true; // plural: "ghadyale"
    return key.length >= 4 && editDistanceAtMostOne(key, k); // typo
  });
};

/**
 * Expand a raw query into every term worth searching:
 * the original text, each word, and the English catalog words of any matched concept.
 */
export const expandSearchTerms = (raw) => {
  const q = String(raw || "").trim().slice(0, 100);
  if (!q) return { terms: [], translated: [] };

  const words = q.split(/\s+/).filter(Boolean);
  const translated = new Set();
  for (const w of words) {
    for (const entry of INDEX) {
      if (matchesConcept(w, entry)) entry.en.forEach((e) => translated.add(e));
    }
  }

  const terms = [...new Set([q, ...words.filter((w) => w.length > 1), ...translated])];
  return { terms, translated: [...translated] };
};

/**
 * Sequelize OR-clauses for `q` across the given columns (plain column names,
 * or "$assoc.col$" paths for included models).
 */
export const buildSearchClauses = (raw, fields) => {
  const { terms, translated } = expandSearchTerms(raw);
  const clauses = [];
  for (const term of terms) {
    const like = likeTerm(term);
    for (const f of fields) clauses.push({ [f]: { [Op.like]: like } });
  }
  return { clauses, translated };
};
