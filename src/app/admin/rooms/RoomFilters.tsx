"use client";

import { useRouter } from "next/navigation";
import type { Property } from "@/lib/types";

export function RoomFilters({
  properties,
  currentFilter,
}: {
  properties: Property[];
  currentFilter: string;
}) {
  const router = useRouter();

  return (
    <div className="mb-4">
      <select
        value={currentFilter}
        onChange={(e) => {
          const val = e.target.value;
          router.push(val ? `/admin/rooms?property=${val}` : "/admin/rooms");
        }}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
