export const AUTH_COOKIE_NAME = "fr_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Inquiry Constants ──────────────────────────────────────────────────────

export const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
] as const;

export const INCOME_OPTIONS = [
  { value: "0_1000", label: "$0 - $1,000" },
  { value: "1000_2000", label: "$1,000 - $2,000" },
  { value: "2000_3000", label: "$2,000 - $3,000" },
  { value: "3000_plus", label: "$3,000+" },
] as const;

export const OCCUPANT_OPTIONS_COLIVING = [
  { value: "1", label: "Just me" },
  { value: "2", label: "2 people" },
] as const;

export const OCCUPANT_OPTIONS_WHOLEHOUSE = [
  { value: "1", label: "1 person" },
  { value: "2", label: "2 people" },
  { value: "3", label: "3 people" },
  { value: "4", label: "4 people" },
  { value: "5", label: "5 people" },
  { value: "6+", label: "6+ people" },
] as const;

export const VALID_OCCUPANTS = ["1", "2", "3", "4", "5", "6+"] as string[];

export const INQUIRY_STATUSES = ["new", "reviewed", "contacted", "rejected"] as const;

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  contacted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export const VALID_EMPLOYMENT = EMPLOYMENT_OPTIONS.map((o) => o.value) as unknown as string[];
export const VALID_INCOME = INCOME_OPTIONS.map((o) => o.value) as unknown as string[];

export const REFERRAL_SOURCE_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "craigslist", label: "Craigslist" },
  { value: "google", label: "Google Search" },
  { value: "friend", label: "Friend / Referral" },
  { value: "other", label: "Other" },
] as const;

export const CONTACT_METHOD_OPTIONS = [
  { value: "call", label: "Phone Call" },
  { value: "text", label: "Text Message" },
  { value: "email", label: "Email" },
] as const;

export const VALID_REFERRAL_SOURCES = REFERRAL_SOURCE_OPTIONS.map((o) => o.value) as unknown as string[];
export const VALID_CONTACT_METHODS = CONTACT_METHOD_OPTIONS.map((o) => o.value) as unknown as string[];

// ─── Expense Constants ──────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  { value: "mortgage", label: "Mortgage Payment" },
  { value: "electricity", label: "Electricity Bill" },
  { value: "water", label: "Water Bill" },
  { value: "internet", label: "Internet Bill" },
  { value: "pest_control", label: "Pest Control" },
  { value: "repairs", label: "Monthly Repairs" },
  { value: "cleaning", label: "Cleaning" },
  { value: "lender_payment", label: "Private Money Lender Payment" },
  { value: "landscaping", label: "Landscaping" },
  { value: "other", label: "Other" },
] as const;

export const VALID_EXPENSE_CATEGORIES = EXPENSE_CATEGORIES.map((c) => c.value) as unknown as string[];
