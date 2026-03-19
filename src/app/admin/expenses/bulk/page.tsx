import { redirect } from "next/navigation";
import Link from "next/link";
import { getProperties, createBulkExpenses } from "@/lib/actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { getCurrentMonth } from "@/lib/utils";

export default async function BulkExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; month?: string }>;
}) {
  const params = await searchParams;
  const properties = await getProperties();
  const selectedProperty = params.property ? Number(params.property) : properties[0]?.id;
  const selectedMonth = params.month || getCurrentMonth();

  async function handleSubmit(formData: FormData) {
    "use server";
    const property_id = Number(formData.get("property_id"));
    const month = formData.get("month") as string;

    if (!property_id || !month) return;

    const entries: { property_id: number; category: string; amount: number; month: string; notes: string | null }[] = [];

    for (const cat of EXPENSE_CATEGORIES) {
      const amount = Number(formData.get(`amount_${cat.value}`));
      const notes = (formData.get(`notes_${cat.value}`) as string) || null;
      if (!amount || amount <= 0) continue;
      entries.push({ property_id, category: cat.value, amount, month, notes });
    }

    if (entries.length > 0) {
      await createBulkExpenses(entries);
    }

    redirect(`/admin/expenses?property=${property_id}&month=${month}`);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Enter Expenses</h1>
        <Link
          href="/admin/expenses"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Back to Expenses
        </Link>
      </div>

      <form action={handleSubmit}>
        {/* Property & Month Selection */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select
                name="property_id"
                defaultValue={selectedProperty}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
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
          </div>
        </div>

        {/* All Categories */}
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter amounts for each category</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Amount ($)</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSE_CATEGORIES.map((cat, i) => (
                <tr key={cat.value} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-2 font-medium text-gray-900">{cat.label}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      name={`amount_${cat.value}`}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-28 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      name={`notes_${cat.value}`}
                      placeholder="Optional notes"
                      maxLength={500}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            Save All Expenses
          </button>
        </div>
      </form>
    </div>
  );
}
