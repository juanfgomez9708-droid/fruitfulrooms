import Link from "next/link";
import { getTenants, deleteTenant, getAllRooms } from "@/lib/actions";

export default async function TenantsPage() {
  const tenants = await getTenants();
  const rooms = await getAllRooms();
  const roomMap = new Map(
    rooms.map((r) => [r.id, `${r.property_name} - Room ${r.room_number}`])
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <Link
          href="/admin/tenants/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="card text-center text-gray-500">
          No tenants yet. Add your first tenant to get started.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
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
            <tbody>
              {tenants.map((tenant, i) => (
                <tr
                  key={tenant.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="py-2 font-medium text-gray-900">{tenant.name}</td>
                  <td className="py-2 text-gray-600">{tenant.email ?? "-"}</td>
                  <td className="py-2 text-gray-600">{tenant.phone ?? "-"}</td>
                  <td className="py-2 text-gray-600">
                    {tenant.room_id ? roomMap.get(tenant.room_id) ?? "Unassigned" : "Unassigned"}
                  </td>
                  <td className="py-2 text-gray-600">{tenant.move_in_date ?? "-"}</td>
                  <td className="py-2">
                    <span className={`badge badge-${tenant.status}`}>
                      {tenant.status}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
