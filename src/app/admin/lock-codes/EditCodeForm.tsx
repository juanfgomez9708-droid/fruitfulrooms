"use client";

import { useState } from "react";

export function EditCodeForm({
  id,
  currentCode,
  currentLabel,
  currentTenantId,
  tenants,
  action,
}: {
  id: number;
  currentCode: string;
  currentLabel: string;
  currentTenantId: number | null;
  tenants: { id: number; name: string; label?: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
      >
        Edit
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <form action={action} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={id} />
            <input
              type="text"
              name="code"
              defaultValue={currentCode}
              placeholder="Code"
              required
              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              type="text"
              name="label"
              defaultValue={currentLabel}
              placeholder="Label"
              className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <select
              name="tenant_id"
              defaultValue={currentTenantId ?? ""}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">None (Spare)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label || t.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
