import { getAllLockCodesGrouped, getProperties, getAllRooms, getTenantsWithRooms, createLockCode, updateLockCode, deleteLockCode } from "@/lib/actions";
import { redirect } from "next/navigation";
import { LockCodeFilters } from "./LockCodeFilters";
import { DeleteCodeButton } from "./DeleteCodeButton";
import { EditCodeForm } from "./EditCodeForm";

export default async function LockCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const { property: propertyFilter } = await searchParams;
  const propertyId = propertyFilter ? Number(propertyFilter) : undefined;

  const [codes, properties, allRooms, tenants] = await Promise.all([
    getAllLockCodesGrouped(propertyId),
    getProperties(),
    getAllRooms(),
    getTenantsWithRooms(),
  ]);

  // Group codes by property then room
  const grouped: Record<string, Record<string, typeof codes>> = {};
  for (const code of codes) {
    if (!grouped[code.property_name]) grouped[code.property_name] = {};
    if (!grouped[code.property_name][code.room_number]) grouped[code.property_name][code.room_number] = [];
    grouped[code.property_name][code.room_number].push(code);
  }

  // Filter rooms list by property if filter is active
  const filteredRooms = propertyId
    ? allRooms.filter((r) => r.property_id === propertyId)
    : allRooms;

  // Tenant list for dropdowns
  const tenantList = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    label: `${t.name} (${t.property_name} — ${t.room_number})`,
  }));

  const redirectUrl = propertyFilter
    ? `/admin/lock-codes?property=${propertyFilter}`
    : "/admin/lock-codes";

  async function handleCreate(formData: FormData) {
    "use server";
    const room_id = Number(formData.get("room_id"));
    const code = (formData.get("code") as string)?.trim();
    const label = (formData.get("label") as string)?.trim() || "";
    const tenant_id_str = formData.get("tenant_id") as string;
    const tenant_id = tenant_id_str ? Number(tenant_id_str) : null;

    if (!room_id || !code) return;

    await createLockCode({ room_id, code, label, tenant_id });
    redirect(redirectUrl);
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    const code = (formData.get("code") as string)?.trim();
    const label = (formData.get("label") as string)?.trim() || "";
    const tenant_id_str = formData.get("tenant_id") as string;
    const tenant_id = tenant_id_str ? Number(tenant_id_str) : null;

    if (!id || !code) return;

    await updateLockCode(id, { code, label, tenant_id });
    redirect(redirectUrl);
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id) return;
    await deleteLockCode(id);
    redirect(redirectUrl);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lock Codes</h1>
      </div>

      <LockCodeFilters
        properties={properties}
        currentFilter={propertyFilter ?? ""}
      />

      {/* Add New Code Form */}
      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Add Lock Code</h2>
        <form action={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Room</label>
            <select
              name="room_id"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select room...</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.property_name} — {r.room_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Code</label>
            <input
              type="text"
              name="code"
              required
              placeholder="1234"
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Label</label>
            <input
              type="text"
              name="label"
              placeholder="Master, Spare 1, etc."
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Assign to Tenant</label>
            <select
              name="tenant_id"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">None (Spare)</option>
              {tenantList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Code
          </button>
        </form>
      </div>

      {/* Grouped Lock Codes */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card text-center text-gray-500">
          No lock codes yet. Add your first code above.
        </div>
      ) : (
        Object.entries(grouped).map(([propertyName, rooms]) => (
          <div key={propertyName} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">{propertyName}</h2>
            {Object.entries(rooms).map(([roomNumber, roomCodes]) => (
              <div key={roomNumber} className="card mb-3">
                <h3 className="mb-2 text-sm font-semibold text-gray-600">{roomNumber}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 font-medium">Code</th>
                        <th className="pb-2 font-medium">Label</th>
                        <th className="pb-2 font-medium">Assigned To</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomCodes.map((lc, i) => (
                        <tr
                          key={lc.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="py-2 font-mono text-sm">{lc.code}</td>
                          <td className="py-2">{lc.label || "—"}</td>
                          <td className="py-2">
                            {lc.tenant_name ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {lc.tenant_name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                Spare
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-1">
                              <EditCodeForm
                                id={lc.id}
                                currentCode={lc.code}
                                currentLabel={lc.label}
                                currentTenantId={lc.tenant_id}
                                tenants={tenantList}
                                action={handleUpdate}
                              />
                              <DeleteCodeButton id={lc.id} action={handleDelete} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
