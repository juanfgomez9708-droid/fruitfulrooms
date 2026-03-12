import Link from "next/link";
import { getAllRooms, getProperties, deleteRoom } from "@/lib/actions";
import { RoomFilters } from "./RoomFilters";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const { property: propertyFilter } = await searchParams;
  const allRooms = await getAllRooms();
  const properties = await getProperties();

  const rooms = propertyFilter
    ? allRooms.filter((r) => r.property_id === Number(propertyFilter))
    : allRooms;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
        <Link
          href="/admin/rooms/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Room
        </Link>
      </div>

      <RoomFilters
        properties={properties}
        currentFilter={propertyFilter ?? ""}
      />

      {rooms.length === 0 ? (
        <div className="card text-center text-gray-500">
          No rooms found. Add a property first, then add rooms.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Property</th>
                <th className="pb-2 font-medium">Room #</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, i) => (
                <tr
                  key={room.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="py-2">{room.property_name}</td>
                  <td className="py-2">{room.room_number}</td>
                  <td className="py-2">${room.price.toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`badge badge-${room.status}`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/rooms/${room.id}/edit`}
                        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteRoom(room.id);
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
