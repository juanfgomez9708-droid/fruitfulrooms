import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getRoom, updateRoom, getProperties } from "@/lib/actions";

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoom(Number(id));
  if (!room) notFound();

  const properties = await getProperties();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateRoom(Number(id), {
      room_number: formData.get("room_number") as string,
      price: Number(formData.get("price")),
      status: formData.get("status") as string,
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Room</h1>

      <form action={handleUpdate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Property</label>
          <p className="text-sm text-gray-600">
            {properties.find((p) => p.id === room.property_id)?.name ?? "Unknown"}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Room Number *</label>
          <input
            name="room_number"
            required
            defaultValue={room.room_number}
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
            defaultValue={room.price}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            defaultValue={room.status}
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
            defaultValue={room.amenities ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={room.description ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
          <input
            name="photo_url"
            type="url"
            defaultValue={room.photo_url ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Update Room
        </button>
      </form>
    </div>
  );
}
