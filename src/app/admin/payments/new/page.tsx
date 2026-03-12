import Link from "next/link";
import { redirect } from "next/navigation";
import { createPayment, getTenants } from "@/lib/actions";

export default async function NewPaymentPage() {
  const tenants = await getTenants();
  const activeTenants = tenants.filter((t) => t.status === "active");

  async function handleCreate(formData: FormData) {
    "use server";
    await createPayment({
      tenant_id: Number(formData.get("tenant_id")),
      amount: Number(formData.get("amount")),
      due_date: formData.get("due_date") as string,
      notes: (formData.get("notes") as string) || undefined,
    });
    redirect("/admin/payments");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/payments"
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        &larr; Back to Payments
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Record Payment</h1>

      <form action={handleCreate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tenant *</label>
          <select
            name="tenant_id"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select a tenant</option>
            {activeTenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount *</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Due Date *</label>
          <input
            name="due_date"
            type="date"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Record Payment
        </button>
      </form>
    </div>
  );
}
