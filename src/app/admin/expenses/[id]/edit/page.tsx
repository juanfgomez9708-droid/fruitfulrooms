import { redirect } from "next/navigation";
import Link from "next/link";
import { getExpense, updateExpense, getProperties } from "@/lib/actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await getExpense(Number(id));
  const properties = await getProperties();

  if (!expense) {
    redirect("/admin/expenses");
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    const category = formData.get("category") as string;
    const amount = Number(formData.get("amount"));
    const month = formData.get("month") as string;
    const rawNotes = formData.get("notes") as string;
    const notes = rawNotes?.trim() || null;

    await updateExpense(Number(id), { category, amount, month, notes });
    redirect(`/admin/expenses?month=${month}`);
  }

  const propertyName = properties.find((p) => p.id === expense.property_id)?.name ?? "Unknown";

  return (
    <div>
      <Link
        href="/admin/expenses"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        ← Back to Expenses
      </Link>

      <div className="card max-w-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Edit Expense</h1>
        <p className="text-sm text-gray-500 mb-6">{propertyName} — {expense.month}</p>

        <form action={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              required
              defaultValue={expense.category}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
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
              defaultValue={expense.amount}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              name="month"
              required
              defaultValue={expense.month}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              name="notes"
              maxLength={500}
              defaultValue={expense.notes ?? ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
