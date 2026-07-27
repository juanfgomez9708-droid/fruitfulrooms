import { test, expect, describe } from "bun:test";
import { computePropertyHealth, bandForScore, type HealthSnapshot } from "./health";
import type { Property, Room, MaintenanceIssue } from "./types";

const NOW = new Date("2026-07-15T12:00:00Z"); // day 15 of the month
const DAY = 86_400_000;

function daysAgo(n: number, from: Date = NOW): string {
  return new Date(from.getTime() - n * DAY).toISOString();
}

function makeProperty(over: Partial<Property> = {}): Property {
  return {
    id: 1,
    name: "Test House",
    address: "123 Main",
    city: "Austin",
    description: null,
    photo_url: null,
    rental_type: "co-living",
    bedrooms: null,
    bathrooms: null,
    price: null,
    status: null,
    lease_minimum: null,
    utilities_included: true,
    photos: null,
    created_at: daysAgo(400),
    ...over,
  };
}

function makeRoom(status: Room["status"], vacantSince: string | null, id = 1): Room {
  return {
    id,
    property_id: 1,
    room_number: String(id),
    price: 800,
    status,
    amenities: null,
    photo_url: null,
    photos: null,
    description: null,
    vacant_since: vacantSince,
    created_at: daysAgo(400),
  };
}

function makeIssue(over: Partial<MaintenanceIssue> = {}): MaintenanceIssue {
  return {
    id: 1,
    property_id: 1,
    room_id: null,
    title: "Issue",
    description: null,
    priority: "medium",
    status: "open",
    reported_at: daysAgo(1),
    resolved_at: null,
    cost: null,
    created_at: daysAgo(1),
    ...over,
  };
}

const ALL_BILLS = new Set(["electricity", "water", "mortgage", "lender_payment", "internet"]);
const ALL_TASKS_FRESH: Record<string, string> = {
  house_cleaning: daysAgo(3),
  ac_filter: daysAgo(3),
  lock_battery: daysAgo(3),
  pest_control: daysAgo(3),
  landscaping: daysAgo(3),
  smoke_detector: daysAgo(3),
};

function baseSnapshot(over: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    property: makeProperty(),
    rooms: [makeRoom("occupied", null, 1), makeRoom("occupied", null, 2), makeRoom("occupied", null, 3)],
    activeTenants: 3,
    unpaidTenants: 0,
    paidBillCategories: new Set(ALL_BILLS),
    latestLogs: { ...ALL_TASKS_FRESH },
    openIssues: [],
    now: NOW,
    ...over,
  };
}

describe("bandForScore", () => {
  test("thresholds", () => {
    expect(bandForScore(100)).toBe("green");
    expect(bandForScore(85)).toBe("green");
    expect(bandForScore(84)).toBe("yellow");
    expect(bandForScore(65)).toBe("yellow");
    expect(bandForScore(64)).toBe("red");
    expect(bandForScore(0)).toBe("red");
  });
});

describe("computePropertyHealth", () => {
  test("a perfectly healthy property scores 100 / green", () => {
    const h = computePropertyHealth(baseSnapshot());
    expect(h.score).toBe(100);
    expect(h.band).toBe("green");
    expect(h.cappedBy).toBeNull();
    for (const f of h.factors) expect(f.penalty).toBeCloseTo(0, 5);
  });

  test("a fully vacant house is forced red by the vacancy cap", () => {
    const h = computePropertyHealth(
      baseSnapshot({
        rooms: [
          makeRoom("vacant", daysAgo(10), 1),
          makeRoom("vacant", daysAgo(10), 2),
          makeRoom("vacant", daysAgo(10), 3),
        ],
        activeTenants: 0,
        unpaidTenants: 0,
      })
    );
    expect(h.band).toBe("red");
    expect(h.score).toBeLessThanOrEqual(64);
    expect(h.cappedBy).toBeTruthy();
  });

  test("a single freshly-vacant room in a 4-room house stays green", () => {
    const h = computePropertyHealth(
      baseSnapshot({
        rooms: [
          makeRoom("occupied", null, 1),
          makeRoom("occupied", null, 2),
          makeRoom("occupied", null, 3),
          makeRoom("vacant", NOW.toISOString(), 4),
        ],
      })
    );
    const vac = h.factors.find((f) => f.key === "vacancy")!;
    // floor 0.3 severity for one of four rooms → ~2.55 points
    expect(vac.penalty).toBeGreaterThan(2);
    expect(vac.penalty).toBeLessThan(3);
    expect(h.band).toBe("green");
    expect(h.cappedBy).toBeNull();
  });

  test("a room vacant 50 days trips the 45-day red cap", () => {
    const h = computePropertyHealth(
      baseSnapshot({
        rooms: [
          makeRoom("occupied", null, 1),
          makeRoom("occupied", null, 2),
          makeRoom("occupied", null, 3),
          makeRoom("vacant", daysAgo(50), 4),
        ],
      })
    );
    expect(h.band).toBe("red");
    expect(h.cappedBy).toContain("vacant");
  });

  test("overdue rent penalizes proportionally after the grace period", () => {
    const h = computePropertyHealth(baseSnapshot({ activeTenants: 4, unpaidTenants: 2 }));
    const rent = h.factors.find((f) => f.key === "overdue_rent")!;
    // 2 of 4 unpaid → severity 0.5 → 16 * 0.5 = 8
    expect(rent.penalty).toBeCloseTo(8, 1);
    expect(rent.status).toBe("critical");
  });

  test("no overdue-rent penalty during the grace period (before the 5th)", () => {
    const h = computePropertyHealth(
      baseSnapshot({ activeTenants: 4, unpaidTenants: 4, now: new Date("2026-07-03T12:00:00Z") })
    );
    const rent = h.factors.find((f) => f.key === "overdue_rent")!;
    expect(rent.penalty).toBe(0);
  });

  test("unpaid essential utility late in the month caps at yellow", () => {
    const paid = new Set(["mortgage", "lender_payment", "internet"]); // electricity + water missing
    const h = computePropertyHealth(
      baseSnapshot({ paidBillCategories: paid, now: new Date("2026-07-25T12:00:00Z") })
    );
    expect(h.band).toBe("yellow");
    expect(h.score).toBeLessThanOrEqual(84);
    expect(h.cappedBy).toBeTruthy();
    const bill = h.factors.find((f) => f.key === "bill_essential")!;
    expect(bill.status).toBe("critical");
  });

  test("an urgent open issue caps an otherwise-healthy property at yellow", () => {
    const h = computePropertyHealth(
      baseSnapshot({ openIssues: [makeIssue({ priority: "urgent", reported_at: daysAgo(1) })] })
    );
    expect(h.band).toBe("yellow");
    expect(h.score).toBeLessThanOrEqual(84);
    expect(h.cappedBy).toBe("Urgent maintenance issue open");
  });

  test("never-logged upkeep tasks apply the partial default penalty", () => {
    const h = computePropertyHealth(baseSnapshot({ latestLogs: {} }));
    const ac = h.factors.find((f) => f.key === "ac_filter")!;
    expect(ac.status).toBe("unknown");
    expect(ac.penalty).toBeCloseTo(5 * 0.6, 5); // weight 5 * neverLoggedRatio 0.6
    // occupancy + bills healthy, so it stays green despite the unlogged tasks
    expect(h.band).toBe("green");
  });

  test("an overdue A/C filter takes its full weight", () => {
    const logs = { ...ALL_TASKS_FRESH, ac_filter: daysAgo(100) }; // cadence 60 + grace 30 = 90
    const h = computePropertyHealth(baseSnapshot({ latestLogs: logs }));
    const ac = h.factors.find((f) => f.key === "ac_filter")!;
    expect(ac.penalty).toBeCloseTo(5, 5);
    expect(ac.status).toBe("overdue");
  });

  test("a task due soon (within cadence) carries no penalty yet", () => {
    const logs = { ...ALL_TASKS_FRESH, ac_filter: daysAgo(55) }; // cadence 60, not yet due
    const h = computePropertyHealth(baseSnapshot({ latestLogs: logs }));
    const ac = h.factors.find((f) => f.key === "ac_filter")!;
    expect(ac.penalty).toBe(0);
    expect(ac.status).toBe("due_soon");
  });

  test("whole-house property with no rooms uses its status for vacancy", () => {
    const h = computePropertyHealth(
      baseSnapshot({
        property: makeProperty({ rental_type: "whole-house", status: "available" }),
        rooms: [],
        activeTenants: 0,
      })
    );
    const vac = h.factors.find((f) => f.key === "vacancy")!;
    expect(vac.penalty).toBeGreaterThan(0);
    // available whole-house = fully vacant → rate 1.0 trips the red cap
    expect(h.band).toBe("red");
  });

  test("a rented whole-house property scores healthy even if it has stray vacant rooms", () => {
    const h = computePropertyHealth(
      baseSnapshot({
        property: makeProperty({ rental_type: "whole-house", status: "rented" }),
        // A leftover vacant room record must not drag a rented whole-house down.
        rooms: [makeRoom("vacant", daysAgo(90), 1)],
        activeTenants: 1,
        unpaidTenants: 0,
      })
    );
    const vac = h.factors.find((f) => f.key === "vacancy")!;
    expect(vac.penalty).toBe(0);
    expect(h.band).toBe("green");
  });

  test("all factor weights sum to 100", () => {
    const h = computePropertyHealth(baseSnapshot());
    const total = h.factors.reduce((s, f) => s + f.weight, 0);
    expect(total).toBe(100);
  });
});
