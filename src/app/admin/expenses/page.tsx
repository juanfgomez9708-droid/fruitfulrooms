import { redirect } from "next/navigation";
import Link from "next/link";
import { getExpenses, getProperties, createExpense, deleteExpense } from "@/lib/actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { getCurrentMonth } from "@/lib/utils";

const categoryLabels = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]));

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; month?: string }>;
}) {
  const params = await searchParams;
  const properties = await getProperties();
  const selectedProperty = params.property ? Number(params.property) : undefined;
  const selectedMonth = params.month || getCurrentMonth();

  const expenses = await getExpenses(selectedProperty, selectedMonth);

  const totalForMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  async function addExpense(formData: FormData) {
    "use server";
    const property_id = Number(formData.get("property_id"));
    const category = formData.get("category") as string;
    const amount = Number(formData.get("amount"));
    const month = formData.get("month") as string;
    const notes = (formData.get("notes") as string) || undefined;

    if (!property_id || !category || amount == null || isNaN(amount) || !month) return;

    await createExpense({ property_id, category, amount, month, notes });

    const searchParts = [];
    if (property_id) searchParts.push(`property=${property_id}`);
    if (month) searchParts.push(`month=${month}`);
    redirect(`/admin/expenses${searchParts.length ? "?" + searchParts.join("&") : ""}`);
  }

  async function removeExpense(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await deleteExpense(id);
    redirect(`/admin/expenses?month=${selectedMonth}${selectedProperty ? `&property=${selectedProperty}` : ""}`);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Expenses</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Expense</h2>
            <form action={addExpense} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select
                  name="property_id"
                  required
                  defaultValue={selectedProperty ?? ""}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select category</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <input
                  type="month"
                  name="month"
                  required
                  defaultValue={selectedMonth}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  name="notes"
                  maxLength={500}
                  placeholder="e.g., plumber for kitchen sink"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Add Expense
              </button>
            </form>
          </div>
        </div>

        {/* Expense List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedMonth} Expenses
              </h2>
              <span className="text-lg font-bold text-red-600">
                ${totalForMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {expenses.length === 0 ? (
              <p className="text-sm text-gray-500">No expenses recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Property</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium">Notes</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense, i) => (
                      <tr
                        key={expense.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="py-2 font-medium text-gray-900">{expense.property_name}</td>
                        <td className="py-2 text-gray-600">{categoryLabels[expense.category] ?? expense.category}</td>
                        <td className="py-2 text-right font-medium">${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 text-gray-500 text-xs max-w-[200px] truncate">{expense.notes ?? "-"}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/expenses/${expense.id}/edit`}
                              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                            >
                              Edit
                            </Link>
                            <form action={removeExpense}>
                              <input type="hidden" name="id" value={expense.id} />
                              <button
                                type="submit"
                                className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
