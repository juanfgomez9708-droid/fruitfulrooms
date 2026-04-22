"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TIME_PERIODS } from "@/lib/utils";
import type { Property } from "@/lib/types";

interface Props {
  properties: Property[];
  selectedProperty?: number;
  selectedPeriod: string;
  selectedMonth: string;
}

export function DashboardFilters({ properties, selectedProperty, selectedPeriod, selectedMonth }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`/admin?${params.toString()}`);
  }

  const showMonthPicker = selectedPeriod === "monthly" || selectedPeriod === "annual";

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* Property Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
          <select
            value={selectedProperty ?? ""}
            onChange={(e) => navigate({ property: e.target.value || undefined })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Time Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => navigate({ period: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIME_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Month Picker */}
        {showMonthPicker && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedPeriod === "annual" ? "Year" : "Month"}
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => navigate({ month: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
