import Link from "next/link";
import { getPayments, getTenants, markPaymentPaid } from "@/lib/actions";
import { PaymentFilters } from "./PaymentFilters";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const allPayments = await getPayments();
  const tenants = await getTenants();
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  const payments =
    statusFilter && statusFilter !== "all"
      ? allPayments.filter((p) => p.status === statusFilter)
      : allPayments;

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

      <PaymentFilters currentFilter={statusFilter ?? "all"} />

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
