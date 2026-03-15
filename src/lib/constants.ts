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

export const INQUIRY_STATUSES = ["new", "reviewed", "contacted", "rejected"] as const;

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  contacted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export const VALID_EMPLOYMENT = EMPLOYMENT_OPTIONS.map((o) => o.value) as unknown as string[];
export const VALID_INCOME = INCOME_OPTIONS.map((o) => o.value) as unknown as string[];
