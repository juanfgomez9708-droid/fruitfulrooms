import Link from "next/link";
import { redirect } from "next/navigation";
import { createTenant, getVacantRooms } from "@/lib/actions";

export default async function NewTenantPage() {
  const vacantRooms = await getVacantRooms();

  async function handleCreate(formData: FormData) {
    "use server";
    const roomId = formData.get("room_id") as string;
    await createTenant({
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      room_id: roomId ? Number(roomId) : undefined,
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Room Assignment</label>
          <select
            name="room_id"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">No room assigned</option>
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
