import Link from "next/link";
import { getPayments, getTenants, getProperties, markPaymentPaid } from "@/lib/actions";
import { PaymentFilters } from "./PaymentFilters";
import { getCurrentMonth, TIME_PERIODS, getDateRange, type TimePeriod } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; period?: string; month?: string; property?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status;
  const selectedPeriod = (params.period || "monthly") as TimePeriod;
  const selectedMonth = params.month || getCurrentMonth();
  const selectedProperty = params.property ? Number(params.property) : undefined;

  const range = getDateRange(selectedPeriod, selectedMonth);

  const [allPayments, tenants, properties] = await Promise.all([
    range
      ? getPayments(undefined, selectedProperty, range.startMonth, range.endMonth)
      : getPayments(undefined, selectedProperty),
    getTenants(),
    getProperties(),
  ]);

  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));
  const periodLabel = range?.label || "All Time";

  const payments =
    statusFilter && statusFilter !== "all"
      ? allPayments.filter((p) => p.status === statusFilter)
      : allPayments;

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  // Build query string for filters
  function buildQuery(extra?: Record<string, string>) {
    const q: Record<string, string> = { period: selectedPeriod, month: selectedMonth };
    if (selectedProperty) q.property = String(selectedProperty);
    if (statusFilter && statusFilter !== "all") q.status = statusFilter;
    Object.assign(q, extra);
    return "?" + new URLSearchParams(q).toString();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/payments/bulk"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Bulk Entry
          </Link>
          <Link
            href="/admin/payments/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Record Payment
          </Link>
        </div>
      </div>

      {/* Time Period & Property Filters */}
      <div className="card mb-4">
        <form className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
            <select
              name="property"
              defaultValue={selectedProperty ?? ""}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select
              name="period"
              defaultValue={selectedPeriod}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {(selectedPeriod === "monthly" || selectedPeriod === "annual") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {selectedPeriod === "annual" ? "Year" : "Month"}
              </label>
              <input
                type="month"
                name="month"
                defaultValue={selectedMonth}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Filter
          </button>
        </form>
      </div>

      <PaymentFilters currentFilter={statusFilter ?? "all"} queryString={buildQuery({ status: "" })} />

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">{periodLabel} Total</p>
          <p className="mt-1 text-xl font-bold text-gray-900">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="mt-1 text-xl font-bold text-green-600">${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-yellow-600">${(totalAmount - paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="card text-center text-gray-500">
          No payments found.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Tenant</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium">Paid Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, i) => (
                <tr
                  key={payment.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="py-2 font-medium text-gray-900">
                    {tenantMap.get(payment.tenant_id) ?? "Unknown"}
                  </td>
                  <td className="py-2">${payment.amount.toLocaleString()}</td>
                  <td className="py-2">{payment.due_date}</td>
                  <td className="py-2">{payment.paid_date ?? "-"}</td>
                  <td className="py-2">
                    <span className={`badge badge-${payment.status}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {payment.status !== "paid" && (
                      <form
                        action={async () => {
                          "use server";
                          await markPaymentPaid(payment.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          Mark Paid
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
