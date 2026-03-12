"use client";

import { useRouter } from "next/navigation";

const statuses = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
];

export function PaymentFilters({ currentFilter }: { currentFilter: string }) {
  const router = useRouter();

  return (
    <div className="mb-4 flex gap-2">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={() =>
            router.push(
              s.value === "all"
                ? "/admin/payments"
                : `/admin/payments?status=${s.value}`
            )
          }
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            currentFilter === s.value
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
