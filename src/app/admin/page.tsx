import { getDashboardStats, getPayments, getExpenses, getTenants, getProperties } from "@/lib/actions";
import { getCurrentMonth, TIME_PERIODS, getDateRange, type TimePeriod } from "@/lib/utils";
import { DashboardFilters } from "./DashboardFilters";

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
