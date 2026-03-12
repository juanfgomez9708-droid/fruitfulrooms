import Link from "next/link";
import { redirect } from "next/navigation";
import { createRoom, getProperties } from "@/lib/actions";

export default async function NewRoomPage() {
  const properties = await getProperties();

  async function handleCreate(formData: FormData) {
    "use server";
    await createRoom({
      property_id: Number(formData.get("property_id")),
      room_number: formData.get("room_number") as string,
      price: Number(formData.get("price")),
      status: (formData.get("status") as string) || "vacant",
      amenities: (formData.get("amenities") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
      photo_url: (formData.get("photo_url") as string) || undefined,
    });
    redirect("/admin/rooms");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/rooms"
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        &larr; Back to Rooms
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Room</h1>

      <form action={handleCreate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Property *</label>
          <select
            name="property_id"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Room Number *</label>
          <input
            name="room_number"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Price *</label>
          <input
            name="price"
            type="number"
            step="0.01"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Amenities (comma-separated)
          </label>
          <input
            name="amenities"
            placeholder="WiFi, AC, Furnished"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
          <input
            name="photo_url"
            type="url"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Room
        </button>
      </form>
    </div>
  );
}
