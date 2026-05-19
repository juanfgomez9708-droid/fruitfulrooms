import Link from "next/link";
import { getTenants, deleteTenant, getAllRooms } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await getTenants();
  const rooms = await getAllRooms();

  // Build a map: room_id → { property_name, room_number, property_id }
  const roomInfoMap = new Map(
    rooms.map((r) => [
      r.id,
      {
        property_name: r.property_name,
        room_number: r.room_number,
        property_id: r.property_id,
      },
    ])
  );

  // Split active vs archived
  const activeTenants = tenants.filter((t) => t.status === "active");
  const archivedTenants = tenants.filter((t) => t.status === "moved_out");

  // Group active tenants by property, sort by room number within each group
  const grouped = new Map<string, typeof activeTenants>();
  const unassigned: typeof activeTenants = [];

  for (const t of activeTenants) {
    const info = t.room_id ? roomInfoMap.get(t.room_id) : null;
    if (info) {
      const key = info.property_name;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    } else {
      unassigned.push(t);
    }
  }

  // Sort tenants within each property group by room number (numeric)
  for (const [, group] of grouped) {
    group.sort((a, b) => {
      const aNum = parseInt(roomInfoMap.get(a.room_id!)?.room_number ?? "0", 10);
      const bNum = parseInt(roomInfoMap.get(b.room_id!)?.room_number ?? "0", 10);
      return aNum - bNum;
    });
  }

  // Sort property groups alphabetically
  const sortedProperties = [...grouped.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const renderTenantRow = (tenant: (typeof tenants)[0], i: number) => {
    const info = tenant.room_id ? roomInfoMap.get(tenant.room_id) : null;
    return (
      <tr key={tenant.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
        <td className="py-2 font-medium text-gray-900">{tenant.name}</td>
        <td className="py-2 text-gray-600">{tenant.email ?? "-"}</td>
        <td className="py-2 text-gray-600">{tenant.phone ?? "-"}</td>
        <td className="py-2 text-gray-600">
          {info ? `Room ${info.room_number}` : "Unassigned"}
        </td>
        <td className="py-2 text-gray-600">{tenant.move_in_date ?? "-"}</td>
        <td className="py-2">
          <span className={`badge badge-${tenant.status}`}>{tenant.status}</span>
        </td>
        <td className="py-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/tenants/${tenant.id}/edit`}
              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Edit
            </Link>
            <form
              action={async () => {
                "use server";
                await deleteTenant(tenant.id);
              }}
            >
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
    );
  };

  const tableHeader = (
    <thead>
      <tr className="border-b border-gray-200 text-left text-gray-500">
        <th className="pb-2 font-medium">Name</th>
        <th className="pb-2 font-medium">Email</th>
        <th className="pb-2 font-medium">Phone</th>
        <th className="pb-2 font-medium">Room</th>
        <th className="pb-2 font-medium">Move-in</th>
        <th className="pb-2 font-medium">Status</th>
        <th className="pb-2 font-medium">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Tenants{" "}
          <span className="text-base font-normal text-gray-500">
            ({activeTenants.length} active)
          </span>
        </h1>
        <Link
          href="/admin/tenants/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Tenant
        </Link>
      </div>

      {activeTenants.length === 0 && archivedTenants.length === 0 ? (
        <div className="card text-center text-gray-500">
          No tenants yet. Add your first tenant to get started.
        </div>
      ) : (
        <>
          {/* Active tenants grouped by property */}
          {sortedProperties.map(([propertyName, propertyTenants]) => (
            <div key={propertyName} className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                {propertyName}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({propertyTenants.length} tenant{propertyTenants.length !== 1 ? "s" : ""})
                </span>
              </h2>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  {tableHeader}
                  <tbody>
                    {propertyTenants.map((tenant, i) => renderTenantRow(tenant, i))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Unassigned active tenants */}
          {unassigned.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                Unassigned
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({unassigned.length} tenant{unassigned.length !== 1 ? "s" : ""})
                </span>
              </h2>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  {tableHeader}
                  <tbody>
                    {unassigned.map((tenant, i) => renderTenantRow(tenant, i))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Archived tenants — collapsed by default */}
          {archivedTenants.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer text-lg font-semibold text-gray-500 hover:text-gray-700">
                Archived — Moved Out
                <span className="ml-2 text-sm font-normal">
                  ({archivedTenants.length})
                </span>
              </summary>
              <div className="card mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  {tableHeader}
                  <tbody>
                    {archivedTenants.map((tenant, i) => renderTenantRow(tenant, i))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
