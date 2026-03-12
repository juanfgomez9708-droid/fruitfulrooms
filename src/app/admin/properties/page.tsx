import Link from "next/link";
import { getProperties, deleteProperty, getRooms } from "@/lib/actions";

export default async function PropertiesPage() {
  const properties = await getProperties();

  // Get room counts for each property
  const roomCounts = new Map<number, number>();
  for (const p of properties) {
    const rooms = await getRooms(p.id);
    roomCounts.set(p.id, rooms.length);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <Link
          href="/admin/properties/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="card text-center text-gray-500">
          No properties yet. Add your first property to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <div key={property.id} className="card card-hover">
              <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{property.address}</p>
              {property.description && (
                <p className="mt-2 text-sm text-gray-600">{property.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <span>🚪 {roomCounts.get(property.id) ?? 0} rooms</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/admin/properties/${property.id}/edit`}
                  className="rounded bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteProperty(property.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
