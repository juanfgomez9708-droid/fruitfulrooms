"use client";

import { useRouter } from "next/navigation";

const statuses = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
];

export function PaymentFilters({ currentFilter, queryString }: { currentFilter: string; queryString?: string }) {
  const router = useRouter();

  function buildUrl(status: string) {
    if (queryString) {
      const params = new URLSearchParams(queryString.replace(/^\?/, ""));
      if (status === "all") {
        params.delete("status");
      } else {
        params.set("status", status);
      }
      return `/admin/payments?${params.toString()}`;
    }
    return status === "all" ? "/admin/payments" : `/admin/payments?status=${status}`;
  }

  return (
    <div className="mb-4 flex gap-2">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={() => router.push(buildUrl(s.value))}
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
