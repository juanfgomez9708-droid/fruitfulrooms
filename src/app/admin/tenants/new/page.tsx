import Link from "next/link";
import { redirect } from "next/navigation";
import { createTenant, getVacantRooms, getProperties, getTenants } from "@/lib/actions";

export default async function NewTenantPage() {
  const [vacantRooms, properties, tenants] = await Promise.all([
    getVacantRooms(),
    getProperties(),
    getTenants(),
  ]);
  // A whole-house can take a tenant unless it already has an active one
  // (gate on real occupancy, not the status field which could be stale).
  const occupiedPropertyIds = new Set(
    tenants.filter((t) => t.status === "active" && t.property_id).map((t) => t.property_id)
  );
  const availableWholeHouses = properties.filter(
    (p) => p.rental_type === "whole-house" && !occupiedPropertyIds.has(p.id)
  );

  async function handleCreate(formData: FormData) {
    "use server";
    const assignment = (formData.get("assignment") as string) || "";
    const [kind, rawId] = assignment.split(":");
    const assignedId = rawId ? Number(rawId) : undefined;
    await createTenant({
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      room_id: kind === "room" ? assignedId : undefined,
      property_id: kind === "property" ? assignedId : undefined,
      move_in_date: (formData.get("move_in_date") as string) || undefined,
    });
    redirect("/admin/tenants");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/tenants"
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        &larr; Back to Tenants
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Tenant</h1>

      <form action={handleCreate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <input
            name="phone"
            type="tel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Assignment</label>
          <select
            name="assignment"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">No assignment</option>
            {vacantRooms.length > 0 && (
              <optgroup label="Rooms (co-living)">
                {vacantRooms.map((r) => (
                  <option key={`room-${r.id}`} value={`room:${r.id}`}>
                    {r.property_name} - Room {r.room_number} (${r.price}/mo)
                  </option>
                ))}
              </optgroup>
            )}
            {availableWholeHouses.length > 0 && (
              <optgroup label="Whole-house rentals">
                {availableWholeHouses.map((p) => (
                  <option key={`prop-${p.id}`} value={`property:${p.id}`}>
                    {p.name} — Whole House{p.price ? ` ($${p.price}/mo)` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Pick a room for co-living, or a whole-house property for a single-family rental.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Move-in Date</label>
          <input
            name="move_in_date"
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Tenant
        </button>
      </form>
    </div>
  );
}
