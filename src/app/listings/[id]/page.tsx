import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicRoom, getPublicProperty } from "@/lib/actions";

function parseAmenities(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

const getCachedRoom = cache((id: number) => getPublicRoom(id));
const getCachedProperty = cache((id: number) => getPublicProperty(id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getCachedRoom(Number(id));
  if (!room || room.status !== "vacant") {
    return { title: "Room Not Found — Fruitful Rooms Rentals" };
  }
  const property = await getCachedProperty(room.property_id);
  return {
    title: `Room ${room.room_number} at ${property?.name ?? "Fruitful Rooms"} — $${room.price}/week`,
    description: room.description ?? `Affordable room for rent at ${property?.name}. $${room.price} per week.`,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getCachedRoom(Number(id));

  if (!room || room.status !== "vacant") {
    redirect("/listings");
  }

  const property = await getCachedProperty(room.property_id);
  const amenities = parseAmenities(room.amenities);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-card-border bg-card-bg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end bg-clip-text text-transparent">
            Fruitful Rooms
          </Link>
          <Link
            href="/listings"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Browse Rooms
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Back Link */}
        <Link
          href="/listings"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Listings
        </Link>

        {/* Photo */}
        {room.photo_url ? (
          <img
            src={room.photo_url}
            alt={`Room ${room.room_number}`}
            className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl mb-8"
          />
        ) : (
          <div className="w-full h-64 sm:h-80 md:h-96 bg-gradient-to-br from-gradient-start via-gradient-mid to-gradient-end rounded-xl mb-8 flex items-center justify-center">
            <span className="text-white/70 text-7xl font-light">
              {room.room_number}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column — Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title & Price */}
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-accent">
                  ${room.price}
                </span>
                <span className="text-muted">/week</span>
              </div>
              <h1 className="text-2xl font-bold">
                Room {room.room_number} at {property?.name}
              </h1>
              <p className="text-muted mt-1">{property?.city}</p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="badge bg-accent-light text-accent px-3 py-1 text-sm"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Room Description */}
            {room.description && (
              <div>
                <h2 className="font-semibold text-lg mb-2">About This Room</h2>
                <p className="text-muted leading-relaxed">{room.description}</p>
              </div>
            )}

            {/* Property Description */}
            {property?.description && (
              <div>
                <h2 className="font-semibold text-lg mb-2">
                  About {property.name}
                </h2>
                <p className="text-muted leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}
          </div>

          {/* Right Column — Contact */}
          <div>
            <div className="card sticky top-8">
              <h2 className="font-semibold text-lg mb-3">Interested?</h2>
              <p className="text-muted text-sm mb-4">
                This room is available now. Get in touch to schedule a viewing or
                ask any questions.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent flex-shrink-0"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="text-foreground">(386) 310-3035</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent flex-shrink-0"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span className="text-foreground">rentals@fruitfulhomeoffers.com</span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-card-border">
                <span className="badge badge-vacant text-sm px-3 py-1">
                  Available Now
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border py-6 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} Fruitful Rooms Rentals. All rights reserved.</p>
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
