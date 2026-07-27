import { getDashboardStats, getPayments, getExpenses, getTenants, getTenantsWithRooms, getProperties, getPortfolioHealth } from "@/lib/actions";
import { getCurrentMonth, TIME_PERIODS, getDateRange, type TimePeriod } from "@/lib/utils";
import { HEALTH_BAND_META } from "@/lib/constants";
import type { PropertyHealth } from "@/lib/types";
import { DashboardFilters } from "./DashboardFilters";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; period?: string; month?: string }>;
}) {
  const params = await searchParams;
  const properties = await getProperties();
  const selectedProperty = params.property ? Number(params.property) : undefined;
  const selectedPropertyName = selectedProperty
    ? properties.find((p) => p.id === selectedProperty)?.name
    : undefined;
  const selectedPeriod = (params.period || "monthly") as TimePeriod;
  const selectedMonth = params.month || getCurrentMonth();

  // Static stats from RPC (properties, rooms, tenants, occupancy — don't change with time)
  const stats = await getDashboardStats(selectedProperty);

  // Property health (all properties; filtered for display if a property is selected)
  const portfolioHealth = await getPortfolioHealth();
  const healthToShow = selectedProperty
    ? portfolioHealth.properties.filter((h) => h.propertyId === selectedProperty)
    : [...portfolioHealth.properties].sort((a, b) => a.score - b.score);

  // Financial stats from date-range queries
  const range = getDateRange(selectedPeriod, selectedMonth);
  const [payments, expenses] = await Promise.all([
    range
      ? getPayments(undefined, selectedProperty, range.startMonth, range.endMonth)
      : getPayments(undefined, selectedProperty),
    range
      ? getExpenses(selectedProperty, range.startMonth, range.endMonth)
      : getExpenses(selectedProperty),
  ]);

  const tenants = await getTenants();
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  // ─── Overdue Rent Detection ──────────────────────────────────────────────
  // After the 5th of each month, show active tenants with no "paid" payment for the current month
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const currentMonth = getCurrentMonth();
  const isAfterGracePeriod = dayOfMonth > 5;

  const tenantsWithRooms = await getTenantsWithRooms(selectedProperty);
  const currentMonthPayments = await getPayments(undefined, undefined, currentMonth, currentMonth);

  // Build set of tenant IDs who have paid this month
  const paidTenantIds = new Set(
    currentMonthPayments
      .filter((p) => p.status === "paid")
      .map((p) => p.tenant_id)
  );

  // Find active tenants who haven't paid
  const overdueTenantsData = isAfterGracePeriod
    ? tenantsWithRooms.filter((t) => !paidTenantIds.has(t.id))
    : [];

  // Compute financial KPIs from queried data
  const rentCollected = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const rentOutstanding = payments
    .filter((p) => p.status === "upcoming" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = payments.filter((p) => p.status === "overdue").length;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = rentCollected - totalExpenses;

  const periodLabel = range?.label || "All Time";
  const recentPayments = payments.slice(0, 5);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard{selectedPropertyName ? ` — ${selectedPropertyName}` : ""}
        </h1>
      </div>

      {/* Filters */}
      <DashboardFilters
        properties={properties}
        selectedProperty={selectedProperty}
        selectedPeriod={selectedPeriod}
        selectedMonth={selectedMonth}
      />

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Properties" value={stats.totalProperties} icon="🏠" />
        <StatCard label="Total Rooms" value={stats.totalRooms} icon="🚪" />
        <StatCard label="Active Tenants" value={stats.totalTenants} icon="👤" />
        <StatCard
          label="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon="📈"
        />
      </div>

      {/* Property Health */}
      {healthToShow.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span>🩺</span> Property Health
            </h2>
            <Link href="/admin/health" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {healthToShow.map((h) => (
              <HealthMiniCard key={h.propertyId} health={h} />
            ))}
          </div>
        </div>
      )}

      {/* Overdue Rent Alert */}
      {isAfterGracePeriod && overdueTenantsData.length > 0 && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-800">
              <span className="text-xl">⚠️</span>
              Overdue Rent — {currentMonth}
            </h2>
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              {overdueTenantsData.length} unpaid
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-red-200 text-left text-red-700">
                <th className="pb-2 font-medium">Tenant</th>
                <th className="pb-2 font-medium">Property</th>
                <th className="pb-2 font-medium">Room</th>
                <th className="pb-2 font-medium">Rent</th>
                <th className="pb-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {overdueTenantsData.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? "bg-red-50" : "bg-red-100/50"}>
                  <td className="py-2 font-medium text-red-900">{t.name}</td>
                  <td className="py-2 text-red-800">{t.property_name}</td>
                  <td className="py-2 text-red-800">{t.room_number}</td>
                  <td className="py-2 font-medium text-red-900">${t.room_price.toLocaleString()}</td>
                  <td className="py-2 text-red-800">
                    {t.phone ? (
                      <a href={`tel:${t.phone}`} className="underline hover:text-red-600">{t.phone}</a>
                    ) : (
                      <span className="text-red-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-red-600">
            Showing active tenants with no paid payment recorded for {currentMonth}. Grace period: 5th of the month.
          </p>
        </div>
      )}

      {/* Rent collection */}
      <div className="mb-2 text-sm font-medium text-gray-500">{periodLabel}</div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            ${rentCollected.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            ${rentOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Overdue Payments</p>
          <p className={`mt-1 text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            ${totalExpenses.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Net Income</p>
          <p className={`mt-1 text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${netIncome.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Margin</p>
          <p className={`mt-1 text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
            {rentCollected > 0
              ? `${Math.round((netIncome / rentCollected) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Recent payments */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Payments</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Tenant</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p, i) => (
                <tr
                  key={p.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="py-2">{tenantMap.get(p.tenant_id)?.name ?? "Unknown"}</td>
                  <td className="py-2">${p.amount.toLocaleString()}</td>
                  <td className="py-2">{p.due_date}</td>
                  <td className="py-2">
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HealthMiniCard({ health }: { health: PropertyHealth }) {
  const band = HEALTH_BAND_META[health.band];
  const topConcern = [...health.factors]
    .filter((f) => f.penalty > 0.5)
    .sort((a, b) => b.penalty - a.penalty)[0];
  return (
    <Link
      href="/admin/health"
      className="card card-hover block"
      style={{ borderLeft: `5px solid ${band.color}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{health.propertyName}</p>
          <p className="text-xs font-medium" style={{ color: band.text }}>
            {band.dot} {band.label}
          </p>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: band.bg, color: band.text }}
        >
          {health.score}
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-gray-500">
        {health.cappedBy
          ? `⚠️ ${health.cappedBy}`
          : topConcern
            ? `${topConcern.label} — ${topConcern.detail}`
            : "All healthy"}
      </p>
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
