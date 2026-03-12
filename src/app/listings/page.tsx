import Link from "next/link";
import { getVacantRooms } from "@/lib/actions";

export const metadata = {
  title: "Available Rooms — CoLiving Rentals",
  description: "Browse all available co-living rooms for rent.",
};

export default async function ListingsPage() {
  const rooms = await getVacantRooms();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-card-border bg-card-bg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-accent">
            CoLiving
          </Link>
          <Link
            href="/listings"
            className="text-sm font-medium text-foreground"
          >
            Browse Rooms
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Available Rooms</h1>
        <p className="text-muted mb-8">
          {rooms.length} {rooms.length === 1 ? "room" : "rooms"} available for
          rent
        </p>

        {rooms.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">🏠</div>
            <h2 className="text-xl font-semibold mb-2">
              No rooms currently available
            </h2>
            <p className="text-muted">
              Check back soon — new rooms are added regularly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const amenities: string[] = room.amenities
                ? JSON.parse(room.amenities)
                : [];

              return (
                <Link
                  key={room.id}
                  href={`/listings/${room.id}`}
                  className="card card-hover p-0 overflow-hidden block group"
                >
                  {/* Photo or Placeholder */}
                  {room.photo_url ? (
                    <img
                      src={room.photo_url}
                      alt={`Room ${room.room_number}`}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-400 via-blue-500 to-emerald-500 flex items-center justify-center">
                      <span className="text-white/80 text-5xl font-light">
                        {room.room_number}
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-accent">
                        ${room.price}
                      </span>
                      <span className="text-sm text-muted">/week</span>
                    </div>

                    {/* Property Info */}
                    <h3 className="font-semibold text-lg group-hover:text-accent transition-colors">
                      {room.property_name}
                    </h3>
                    <p className="text-sm text-muted mb-1">
                      {room.property_address}
                    </p>
                    <p className="text-sm text-muted mb-3">
                      Room {room.room_number}
                    </p>

                    {/* Amenities */}
                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {amenities.slice(0, 4).map((amenity) => (
                          <span
                            key={amenity}
                            className="badge bg-accent-light text-accent"
                          >
                            {amenity}
                          </span>
                        ))}
                        {amenities.length > 4 && (
                          <span className="badge bg-accent-light text-accent">
                            +{amenities.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* View Details */}
                    <div className="mt-4 text-sm font-medium text-accent group-hover:underline">
                      View Details →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border py-6 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} CoLiving Rentals. All rights reserved.</p>
          <Link
            href="/admin"
            className="text-xs text-muted/50 hover:text-muted transition-colors"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
