import { redirect } from "next/navigation";
import Link from "next/link";
import { getProperties, getTenantsWithRooms, createBulkPayments } from "@/lib/actions";
import { getCurrentMonth } from "@/lib/utils";

export default async function BulkPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; month?: string }>;
}) {
  const params = await searchParams;
  const selectedProperty = params.property ? Number(params.property) : undefined;
  const selectedMonth = params.month || getCurrentMonth();
  const defaultDueDate = `${selectedMonth}-01`;

  const [properties, tenants] = await Promise.all([
    getProperties(),
    getTenantsWithRooms(selectedProperty),
  ]);

  async function handleSubmit(formData: FormData) {
    "use server";
    const entries: { tenant_id: number; amount: number; due_date: string; status: "paid" | "upcoming"; paid_date: string | null }[] = [];
    const today = new Date().toISOString().slice(0, 10);

    const count = Number(formData.get("count"));
    for (let i = 0; i < count; i++) {
      const checked = formData.get(`paid_${i}`);
      if (!checked) continue;

      const tenant_id = Number(formData.get(`tenant_id_${i}`));
      const amount = Number(formData.get(`amount_${i}`));
      const due_date = formData.get(`due_date_${i}`) as string;
      const mark_paid = formData.get(`mark_paid_${i}`);

      if (!tenant_id || !amount || !due_date) continue;

      entries.push({
        tenant_id,
        amount,
        due_date,
        status: mark_paid ? "paid" : "upcoming",
        paid_date: mark_paid ? today : null,
      });
    }

    if (entries.length > 0) {
      await createBulkPayments(entries);
    }

    redirect("/admin/payments");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Record Payments</h1>
        <Link
          href="/admin/payments"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Back to Payments
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              name="month"
              defaultValue={selectedMonth}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Bulk Entry Form */}
      {tenants.length === 0 ? (
        <div className="card text-center text-gray-500">
          No active tenants found{selectedProperty ? " for this property" : ""}. Assign tenants to rooms first.
        </div>
      ) : (
        <form action={handleSubmit}>
          <input type="hidden" name="count" value={tenants.length} />
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Include</th>
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Property</th>
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Amount ($)</th>
                  <th className="pb-2 font-medium">Due Date</th>
                  <th className="pb-2 font-medium">Mark Paid</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        name={`paid_${i}`}
                        value="1"
                        defaultChecked
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <input type="hidden" name={`tenant_id_${i}`} value={t.id} />
                    </td>
                    <td className="py-2 font-medium text-gray-900">{t.name}</td>
                    <td className="py-2 text-gray-600">{t.property_name}</td>
                    <td className="py-2 text-gray-600">{t.room_number}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        name={`amount_${i}`}
                        defaultValue={t.room_price}
                        min="0"
                        step="0.01"
                        className="w-24 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="date"
                        name={`due_date_${i}`}
                        defaultValue={defaultDueDate}
                        className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        name={`mark_paid_${i}`}
                        value="1"
                        className="h-4 w-4 rounded border-gray-300 text-green-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Record Payments
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
