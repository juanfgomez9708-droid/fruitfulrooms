import { getDashboardStats, getPayments, getTenants } from "@/lib/actions";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const payments = await getPayments();
  const tenants = await getTenants();

  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));
  const overdueCount = payments.filter((p) => p.status === "overdue").length;
  const recentPayments = payments.slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Collected This Month</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            ${stats.rentCollected.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            ${stats.rentOutstanding.toLocaleString()}
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
          <p className="text-sm text-gray-500">Monthly Expenses</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            ${stats.totalExpenses.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Net Income</p>
          <p className={`mt-1 text-2xl font-bold ${stats.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${stats.netIncome.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Margin</p>
          <p className={`mt-1 text-2xl font-bold ${stats.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
            {stats.rentCollected > 0
              ? `${Math.round((stats.netIncome / stats.rentCollected) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Recent payments */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Payments</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
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
                  <td className="py-2">{tenantMap.get(p.tenant_id) ?? "Unknown"}</td>
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
