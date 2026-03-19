export function parseAmenities(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export const TIME_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "last3", label: "Last 3 Months" },
  { value: "last6", label: "Last 6 Months" },
  { value: "quarterly", label: "Quarterly" },
  { value: "ytd", label: "Year to Date" },
  { value: "annual", label: "Annual" },
  { value: "lifetime", label: "Lifetime" },
] as const;

export type TimePeriod = (typeof TIME_PERIODS)[number]["value"];

/** Returns { startMonth, endMonth } in YYYY-MM format for a given period */
export function getDateRange(period: TimePeriod, refMonth?: string): { startMonth: string; endMonth: string; label: string } | null {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const currentMonth = getCurrentMonth();

  switch (period) {
    case "monthly": {
      const m = refMonth || currentMonth;
      return { startMonth: m, endMonth: m, label: m };
    }
    case "last3": {
      const start = new Date(year, month - 2, 1);
      return {
        startMonth: start.toISOString().slice(0, 7),
        endMonth: currentMonth,
        label: `${start.toISOString().slice(0, 7)} to ${currentMonth}`,
      };
    }
    case "last6": {
      const start = new Date(year, month - 5, 1);
      return {
        startMonth: start.toISOString().slice(0, 7),
        endMonth: currentMonth,
        label: `${start.toISOString().slice(0, 7)} to ${currentMonth}`,
      };
    }
    case "quarterly": {
      const q = Math.floor(month / 3);
      const qStart = new Date(year, q * 3, 1);
      const qEnd = new Date(year, q * 3 + 2, 1);
      return {
        startMonth: qStart.toISOString().slice(0, 7),
        endMonth: qEnd.toISOString().slice(0, 7),
        label: `Q${q + 1} ${year}`,
      };
    }
    case "ytd": {
      return {
        startMonth: `${year}-01`,
        endMonth: currentMonth,
        label: `${year} YTD`,
      };
    }
    case "annual": {
      const y = refMonth ? refMonth.slice(0, 4) : String(year);
      return {
        startMonth: `${y}-01`,
        endMonth: `${y}-12`,
        label: y,
      };
    }
    case "lifetime":
      return null; // No filter
  }
}
