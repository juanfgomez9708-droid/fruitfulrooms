// Keyword-based rules for auto-categorizing Relay bank transactions.
// Matched case-insensitively against Payee + Description fields.

export interface PropertyRule {
  keywords: string[];
  property_id: number;
  property_name: string;
}

export interface CategoryRule {
  keywords: string[];
  category: string;
}

// ─── Property Matching ────────────────────────────────────────────────────────
// Matches address fragments or known payees to property IDs.

export const PROPERTY_RULES: PropertyRule[] = [
  { keywords: ["continental", "2115"], property_id: 8, property_name: "Continental House" },
  { keywords: ["woodcrest", "1815"], property_id: 7, property_name: "Woodcrest House" },
  { keywords: ["shady acres", "2185", "shady"], property_id: 9, property_name: "Shady Acres House" },
  { keywords: ["cadillac", "1241"], property_id: 10, property_name: "Cadillac House" },
];

// ─── Expense Category Matching ────────────────────────────────────────────────
// First match wins. Order from most specific to least specific.

export const CATEGORY_RULES: CategoryRule[] = [
  { keywords: ["lakeview ln srv", "mtg pymt", "mortgage"], category: "mortgage" },
  { keywords: ["orlando util com", "ouc", "duke energy", "fpl", "electric", "power bill"], category: "electricity" },
  { keywords: ["water", "toho", "sewer", "water bill"], category: "water" },
  { keywords: ["spectrum", "at&t", "comcast", "internet", "wifi"], category: "internet" },
  { keywords: ["pest", "terminix", "orkin", "exterminator"], category: "pest_control" },
  { keywords: ["home depot", "lowe's", "lowes", "repair", "maintenance", "plumb", "hvac", "handyman"], category: "repairs" },
  { keywords: ["clean", "maid", "janitorial"], category: "cleaning" },
  { keywords: ["rosa rucker", "interest only loan", "lender", "private money", "hard money"], category: "lender_payment" },
  { keywords: ["landscap", "lawn", "mowing"], category: "landscaping" },
];

// ─── Skip Rules ───────────────────────────────────────────────────────────────

export const SKIP_PAYEE_KEYWORDS = [
  "fruitful funding",
];

export const SKIP_STATUSES = ["RETURNED"];

export const SKIP_TRANSACTION_TYPES = ["Receive-transfer", "Spend-transfer"];

// ─── Rent Payment Detection ───────────────────────────────────────────────────

export const RENT_PAYEE_KEYWORDS = ["apartments.com", "zelle", "venmo", "cashapp"];
