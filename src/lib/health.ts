/**
 * Property health scoring — pure, deterministic, and testable.
 *
 * Deduction model: each property starts at 100. Every factor subtracts up to its
 * `weight` in points, ramping from 0 → weight as things go overdue. The final
 * 0–100 score maps to a green / yellow / red band, with critical caps that force
 * an emergency (severe vacancy, imminent utility cutoff) into red/yellow no
 * matter how healthy everything else looks.
 *
 * All tuning lives in constants.ts (UPKEEP_TASKS, DERIVED_WEIGHTS, HEALTH_CONFIG).
 * Nothing here reads the database — callers assemble a HealthSnapshot.
 */

import {
  UPKEEP_TASKS,
  DERIVED_WEIGHTS,
  BILL_GROUPS,
  HEALTH_CONFIG,
  ISSUE_PRIORITIES,
} from "./constants";
import type {
  Property,
  Room,
  MaintenanceIssue,
  HealthFactor,
  HealthBand,
  PropertyHealth,
  FactorStatus,
} from "./types";

export interface HealthSnapshot {
  property: Property;
  rooms: Room[];
  /** Active tenants assigned to a room in this property. */
  activeTenants: number;
  /** Of those active tenants, how many have no `paid` payment for the current month. */
  unpaidTenants: number;
  /** Expense categories that have a logged expense for the current month. */
  paidBillCategories: Set<string>;
  /** task_type → ISO timestamp of the most recent completion. */
  latestLogs: Record<string, string>;
  /** Non-resolved maintenance issues for this property. */
  openIssues: MaintenanceIssue[];
  now: Date;
}

const DAY_MS = 86_400_000;

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_MS;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** 0 while within cadence, linear 0→1 across the grace window, 1 beyond. */
function overdueRamp(daysSince: number, cadenceDays: number, graceDays: number): number {
  if (daysSince <= cadenceDays) return 0;
  if (graceDays <= 0) return 1;
  return clamp01((daysSince - cadenceDays) / graceDays);
}

export function bandForScore(score: number): HealthBand {
  if (score >= HEALTH_CONFIG.greenMin) return "green";
  if (score >= HEALTH_CONFIG.yellowMin) return "yellow";
  return "red";
}

export function computePropertyHealth(snapshot: HealthSnapshot): PropertyHealth {
  const { property, now } = snapshot;
  const factors: HealthFactor[] = [];

  // ─── Vacancy (income) ──────────────────────────────────────────────────────
  const vacancy = buildVacancyFactor(snapshot);
  factors.push(vacancy.factor);

  // ─── Overdue rent (income) ─────────────────────────────────────────────────
  const day = now.getUTCDate();
  {
    const weight = DERIVED_WEIGHTS.overdue_rent;
    let severity = 0;
    let detail = "All rent current";
    if (snapshot.activeTenants === 0) {
      detail = "No active tenants";
    } else if (day <= HEALTH_CONFIG.rentGraceDay) {
      detail = `Within grace period (through the ${HEALTH_CONFIG.rentGraceDay}th)`;
    } else if (snapshot.unpaidTenants > 0) {
      severity = snapshot.unpaidTenants / snapshot.activeTenants;
      detail = `${snapshot.unpaidTenants} of ${snapshot.activeTenants} tenants unpaid this month`;
    } else {
      detail = "All tenants paid this month";
    }
    factors.push({
      key: "overdue_rent",
      label: "Overdue rent",
      category: "income",
      weight,
      penalty: weight * severity,
      status: severity > 0 ? (severity >= 0.5 ? "critical" : "overdue") : "good",
      detail,
      lastDone: null,
      dueDate: null,
    });
  }

  // ─── Monthly bills ─────────────────────────────────────────────────────────
  let essentialUnpaid = false;
  for (const group of BILL_GROUPS) {
    const weight = DERIVED_WEIGHTS[group.key];
    const missing = group.categories.filter((c) => !snapshot.paidBillCategories.has(c));
    let severity = 0;
    let status: FactorStatus = "good";
    let detail = "Paid this month";
    if (missing.length > 0) {
      if (day <= HEALTH_CONFIG.billDueDay) {
        status = "due_soon";
        detail = `Not yet paid (due after the ${HEALTH_CONFIG.billDueDay}th)`;
      } else {
        const missingFrac = missing.length / group.categories.length;
        const timeRamp = clamp01((day - HEALTH_CONFIG.billDueDay) / (28 - HEALTH_CONFIG.billDueDay));
        severity = missingFrac * (0.5 + 0.5 * timeRamp);
        status = day >= HEALTH_CONFIG.utilityCutoffDay ? "critical" : "overdue";
        detail = `Unpaid this month${missing.length < group.categories.length ? ` (${missing.join(", ")})` : ""}`;
        if (group.key === "bill_essential") essentialUnpaid = true;
      }
    }
    factors.push({
      key: group.key,
      label: group.label,
      category: "bills",
      weight,
      penalty: weight * severity,
      status,
      detail,
      lastDone: null,
      dueDate: null,
    });
  }

  // ─── Open maintenance issues ───────────────────────────────────────────────
  let hasUrgentOpen = false;
  {
    const weight = DERIVED_WEIGHTS.open_issues;
    let sum = 0;
    for (const issue of snapshot.openIssues) {
      const pr = ISSUE_PRIORITIES.find((p) => p.value === issue.priority)?.severity ?? 0.4;
      if (issue.priority === "urgent") hasUrgentOpen = true;
      const daysOpen = daysBetween(new Date(issue.reported_at), now);
      const ageFactor = 0.5 + 0.5 * clamp01(daysOpen / 14);
      sum += pr * ageFactor;
    }
    const severity = clamp01(sum / 1.5);
    const count = snapshot.openIssues.length;
    factors.push({
      key: "open_issues",
      label: "Open maintenance issues",
      category: "maintenance",
      weight,
      penalty: weight * severity,
      status: count === 0 ? "good" : hasUrgentOpen ? "critical" : severity > 0.5 ? "overdue" : "due_soon",
      detail: count === 0 ? "No open issues" : `${count} open issue${count === 1 ? "" : "s"}${hasUrgentOpen ? " (incl. urgent)" : ""}`,
      lastDone: null,
      dueDate: null,
    });
  }

  // ─── Scheduled upkeep tasks ────────────────────────────────────────────────
  for (const task of UPKEEP_TASKS) {
    const iso = snapshot.latestLogs[task.key];
    let ratio: number;
    let status: FactorStatus;
    let detail: string;
    let lastDone: string | null = null;
    let dueDate: string | null = null;

    if (!iso) {
      ratio = HEALTH_CONFIG.neverLoggedRatio;
      status = "unknown";
      detail = "Not yet logged";
    } else {
      lastDone = iso;
      const done = new Date(iso);
      const days = daysBetween(done, now);
      dueDate = addDays(done, task.cadenceDays).toISOString();
      ratio = overdueRamp(days, task.cadenceDays, task.graceDays);
      if (days > task.cadenceDays) {
        status = "overdue";
        detail = `${Math.round(days - task.cadenceDays)} day(s) overdue`;
      } else if (days >= task.cadenceDays * 0.8) {
        status = "due_soon";
        detail = `Due in ${Math.max(0, Math.round(task.cadenceDays - days))} day(s)`;
      } else {
        status = "good";
        detail = `Done ${Math.round(days)} day(s) ago`;
      }
    }

    factors.push({
      key: task.key,
      label: task.label,
      category: task.category,
      weight: task.weight,
      penalty: task.weight * ratio,
      status,
      detail,
      lastDone,
      dueDate,
    });
  }

  // ─── Combine ───────────────────────────────────────────────────────────────
  const totalPenalty = factors.reduce((sum, f) => sum + f.penalty, 0);
  let score = Math.max(0, Math.min(100, 100 - totalPenalty));

  // ─── Critical caps ─────────────────────────────────────────────────────────
  let cappedBy: string | null = null;
  if (
    vacancy.vacancyRate >= HEALTH_CONFIG.redCapVacancyRate ||
    vacancy.maxDaysVacant >= HEALTH_CONFIG.redCapVacantDays
  ) {
    if (score > 64) {
      score = 64;
      cappedBy =
        vacancy.maxDaysVacant >= HEALTH_CONFIG.redCapVacantDays
          ? `A room has been vacant ${Math.round(vacancy.maxDaysVacant)}+ days`
          : `${Math.round(vacancy.vacancyRate * 100)}% of rooms vacant`;
    }
  }
  if (essentialUnpaid && day >= HEALTH_CONFIG.utilityCutoffDay && score > 84) {
    score = 84;
    cappedBy = cappedBy ?? "Essential utility unpaid — cutoff risk";
  }
  if (hasUrgentOpen && score > 84) {
    score = 84;
    cappedBy = cappedBy ?? "Urgent maintenance issue open";
  }

  score = Math.round(score);

  return {
    propertyId: property.id,
    propertyName: property.name,
    score,
    band: bandForScore(score),
    cappedBy,
    factors,
  };
}

function buildVacancyFactor(snapshot: HealthSnapshot): {
  factor: HealthFactor;
  vacancyRate: number;
  maxDaysVacant: number;
} {
  const { property, rooms, now } = snapshot;
  const weight = DERIVED_WEIGHTS.vacancy;
  let severity = 0;
  let vacantCount = 0;
  let maxDaysVacant = 0;
  let totalUnits = 0;
  let detail: string;

  // Whole-house properties track occupancy via the property status field, not
  // per-room; co-living uses its rooms. (Fall back to status if a co-living
  // property somehow has no rooms yet.)
  const useRooms = property.rental_type !== "whole-house" && rooms.length > 0;

  if (useRooms) {
    totalUnits = rooms.length;
    let sevSum = 0;
    for (const r of rooms) {
      if (r.status === "vacant") {
        vacantCount++;
        const days = r.vacant_since
          ? daysBetween(new Date(r.vacant_since), now)
          : HEALTH_CONFIG.vacancyFullDays;
        maxDaysVacant = Math.max(maxDaysVacant, days);
        const aging = clamp01(days / HEALTH_CONFIG.vacancyFullDays);
        sevSum += HEALTH_CONFIG.vacancyFloor + (1 - HEALTH_CONFIG.vacancyFloor) * aging;
      }
    }
    severity = clamp01(sevSum / totalUnits);
    detail =
      vacantCount === 0
        ? "Fully occupied"
        : `${vacantCount} of ${totalUnits} room${totalUnits === 1 ? "" : "s"} vacant` +
          (maxDaysVacant >= 1 ? ` (longest ${Math.round(maxDaysVacant)}d)` : "");
  } else {
    // Whole-house property with no per-room breakdown: use the property status.
    totalUnits = 1;
    if (property.status === "rented") {
      severity = 0;
      detail = "Rented";
    } else if (property.status === "maintenance") {
      severity = 0.5;
      vacantCount = 1;
      detail = "Off-market (maintenance)";
    } else {
      severity = 0.7;
      vacantCount = 1;
      detail = "Vacant (available)";
    }
  }

  const vacancyRate = totalUnits > 0 ? vacantCount / totalUnits : 0;
  const penalty = weight * severity;

  return {
    factor: {
      key: "vacancy",
      label: "Room vacancy",
      category: "income",
      weight,
      penalty,
      status: vacantCount === 0 ? "good" : severity >= 0.7 ? "critical" : severity >= 0.35 ? "overdue" : "due_soon",
      detail,
      lastDone: null,
      dueDate: null,
    },
    vacancyRate,
    maxDaysVacant,
  };
}
