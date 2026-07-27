import type { HealthCategory } from "./types";

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

export const INQUIRY_STATUSES = ["new", "reviewed", "contacted", "rejected", "converted"] as const;

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  contacted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-purple-100 text-purple-800",
};

export const DOCUMENT_TYPES = [
  { value: "id_photo", label: "Photo ID" },
  { value: "pay_stub", label: "Pay Stub" },
  { value: "other", label: "Other" },
] as const;

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

// ─── Property Health Tracker ──────────────────────────────────────────────────
//
// The health score is a deduction model: every property starts at 100 and each
// factor below can subtract up to `weight` points. The penalty ramps from 0 up
// to `weight` as something goes overdue, so health "drops a bit" over time.
//
// Weights are calibrated so INCOME (vacancy + rent) is exactly half of a
// property's entire health — occupancy is existential — and landscaping is the
// smallest lever. All weights across derived + scheduled factors sum to 100.
//
// To retune the model, edit the numbers here. No migration required.

/** Scheduled upkeep tasks — completions are recorded in `maintenance_logs`. */
export interface UpkeepTaskDef {
  key: string;
  label: string;
  category: HealthCategory;
  weight: number; // max penalty points
  cadenceDays: number; // how often it should be done
  graceDays: number; // days past due before the full penalty applies
  icon: string;
}

export const UPKEEP_TASKS: UpkeepTaskDef[] = [
  { key: "house_cleaning", label: "House / common-area cleaning", category: "cleanliness", weight: 6, cadenceDays: 30, graceDays: 15, icon: "🧹" },
  { key: "ac_filter", label: "A/C filter replacement", category: "maintenance", weight: 5, cadenceDays: 60, graceDays: 30, icon: "❄️" },
  { key: "lock_battery", label: "Lock battery check", category: "safety", weight: 4, cadenceDays: 90, graceDays: 30, icon: "🔋" },
  { key: "pest_control", label: "Pest control", category: "maintenance", weight: 3, cadenceDays: 90, graceDays: 45, icon: "🐜" },
  { key: "landscaping", label: "Landscaping / lawn", category: "cleanliness", weight: 2, cadenceDays: 30, graceDays: 15, icon: "🌿" },
  { key: "smoke_detector", label: "Smoke / CO detector check", category: "safety", weight: 2, cadenceDays: 180, graceDays: 60, icon: "🚨" },
];

export const UPKEEP_TASK_KEYS = UPKEEP_TASKS.map((t) => t.key);

/** Weights for factors derived from existing data (not logged as tasks). Combined
 *  with the bill-group weights (18) and UPKEEP_TASKS weights (22) = 100. */
export const DERIVED_WEIGHTS = {
  vacancy: 34,
  overdue_rent: 16,
  open_issues: 10,
} as const;

export interface BillGroup {
  key: string;
  label: string;
  categories: string[]; // expense categories that count as this bill being paid
  weight: number;
}

// Each set sums to 18 (the Bills budget) so overall health still tops out at 100.
// Co-living: landlord pays utilities + mortgage/lender + internet.
export const CO_LIVING_BILL_GROUPS: BillGroup[] = [
  { key: "bill_essential", label: "Essential utilities (electric + water)", categories: ["electricity", "water"], weight: 9 },
  { key: "bill_mortgage", label: "Mortgage / lender payment", categories: ["mortgage", "lender_payment"], weight: 6 },
  { key: "bill_internet", label: "Internet", categories: ["internet"], weight: 3 },
];

// Whole-house single-family: tenant covers utilities; landlord pays mortgage + internet.
export const WHOLE_HOUSE_BILL_GROUPS: BillGroup[] = [
  { key: "bill_mortgage", label: "Mortgage", categories: ["mortgage"], weight: 12 },
  { key: "bill_internet", label: "Internet", categories: ["internet"], weight: 6 },
];

/** Which monthly bills count toward a property's health, by rental type. */
export function billGroupsForProperty(rentalType: string | null | undefined): BillGroup[] {
  return rentalType === "whole-house" ? WHOLE_HOUSE_BILL_GROUPS : CO_LIVING_BILL_GROUPS;
}

/** Health tuning knobs. */
export const HEALTH_CONFIG = {
  // Score → band thresholds.
  greenMin: 85,
  yellowMin: 65,
  // Vacancy aging: a room hits full vacancy severity after this many days empty.
  vacancyFullDays: 30,
  // Even a freshly vacant room registers this much severity (lost income now).
  vacancyFloor: 0.3,
  // Rent grace: no overdue-rent penalty until after this day of the month.
  rentGraceDay: 5,
  // Bills are considered due after this day of the month.
  billDueDay: 10,
  // A scheduled task with no log ever recorded applies this share of its weight
  // (labelled "not yet logged" — nudges you to seed the first completion).
  neverLoggedRatio: 0.6,
  // ── Critical caps ──
  // Vacancy this severe forces the property red regardless of everything else.
  redCapVacancyRate: 0.5,
  redCapVacantDays: 45,
  // Essential utility unpaid this far into the month = cutoff risk → cap at yellow.
  utilityCutoffDay: 24,
} as const;

export const ISSUE_PRIORITIES = [
  { value: "low", label: "Low", severity: 0.15 },
  { value: "medium", label: "Medium", severity: 0.4 },
  { value: "high", label: "High", severity: 0.7 },
  { value: "urgent", label: "Urgent", severity: 1.0 },
] as const;

export const VALID_ISSUE_PRIORITIES = ISSUE_PRIORITIES.map((p) => p.value) as unknown as string[];
export const VALID_ISSUE_STATUSES = ["open", "in_progress", "resolved"] as unknown as string[];

export const HEALTH_CATEGORY_LABELS: Record<HealthCategory, string> = {
  income: "Income",
  bills: "Bills",
  maintenance: "Maintenance",
  safety: "Safety",
  cleanliness: "Cleanliness",
};

export const HEALTH_BAND_META = {
  green: { label: "Healthy", color: "#16a34a", bg: "#dcfce7", text: "#166534", dot: "🟢" },
  yellow: { label: "Needs attention", color: "#ca8a04", bg: "#fef9c3", text: "#854d0e", dot: "🟡" },
  red: { label: "Needs work now", color: "#dc2626", bg: "#fee2e2", text: "#991b1b", dot: "🔴" },
} as const;
