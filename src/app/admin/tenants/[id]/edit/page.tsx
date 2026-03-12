import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getTenant, updateTenant, getVacantRooms, getAllRooms } from "@/lib/actions";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenant(Number(id));
  if (!tenant) notFound();

  const vacantRooms = await getVacantRooms();
  const allRooms = await getAllRooms();

  // Include currently assigned room in the dropdown even if occupied
  const currentRoom = tenant.room_id
    ? allRooms.find((r) => r.id === tenant.room_id)
    : null;

  async function handleUpdate(formData: FormData) {
    "use server";
    const roomId = formData.get("room_id") as string;
    await updateTenant(Number(id), {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      room_id: roomId ? Number(roomId) : null,
      move_in_date: (formData.get("move_in_date") as string) || undefined,
      status: formData.get("status") as string,
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Tenant</h1>

      <form action={handleUpdate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input
            name="name"
            required
            defaultValue={tenant.name}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={tenant.email ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <input
            name="phone"
            type="tel"
            defaultValue={tenant.phone ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Room Assignment</label>
          <select
            name="room_id"
            defaultValue={tenant.room_id ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">No room assigned</option>
            {currentRoom && (
              <option value={currentRoom.id}>
                {currentRoom.property_name} - Room {currentRoom.room_number} (current)
              </option>
            )}
            {vacantRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.property_name} - Room {r.room_number} (${r.price}/mo)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Move-in Date</label>
          <input
            name="move_in_date"
            type="date"
            defaultValue={tenant.move_in_date ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            defaultValue={tenant.status}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="moved_out">Moved Out</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Update Tenant
        </button>
      </form>
    </div>
  );
}
