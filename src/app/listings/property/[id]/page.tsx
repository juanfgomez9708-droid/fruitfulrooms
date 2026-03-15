import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicProperty, getPropertyVacantRooms } from "@/lib/actions";
import { parseAmenities } from "@/lib/utils";
import { PublicHeader } from "@/app/components/PublicHeader";
import { PublicFooter } from "@/app/components/PublicFooter";

const getCachedProperty = cache((id: number) => getPublicProperty(id));
const getCachedRooms = cache((id: number) => getPropertyVacantRooms(id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getCachedProperty(Number(id));
  if (!property) {
    return { title: "Property Not Found" };
  }
  const rooms = await getCachedRooms(Number(id));
  const minPrice = rooms.length > 0 ? Math.min(...rooms.map((r) => r.price)) : 0;
  const title = `Rooms for Rent at ${property.name} in ${property.city} — From $${minPrice}/mo`;
  const description = `${rooms.length} furnished rooms available at ${property.name} in ${property.city}. Starting at $${minPrice}/month, all utilities included. No deposit. Apply online.`;

  return {
    title,
    description,
    openGraph: { title, description, url: `https://fruitfulrooms.com/listings/property/${id}` },
    alternates: { canonical: `https://fruitfulrooms.com/listings/property/${id}` },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getCachedProperty(Number(id));

  if (!property) {
    redirect("/listings");
  }

  const rooms = await getCachedRooms(Number(id));

  if (rooms.length === 0) {
    redirect("/listings");
  }

  const minPrice = Math.min(...rooms.map((r) => r.price));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Breadcrumb */}
        <Link
          href="/listings"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All Properties
        </Link>

        {/* Property Hero */}
        {property.photo_url ? (
          <img
            src={property.photo_url}
            alt={property.name}
            className="w-full h-64 sm:h-80 object-cover rounded-xl mb-8"
          />
        ) : (
          <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-gradient-start via-gradient-mid to-gradient-end rounded-xl mb-8 flex items-center justify-center">
            <span className="text-white/70 text-5xl font-light">{property.name}</span>
          </div>
        )}

        {/* Property Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">{property.name}</h1>
          <p className="text-muted mb-4">{property.city}</p>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-muted">From</span>
              <span className="text-2xl font-bold text-accent">${minPrice}</span>
              <span className="text-sm text-muted">/mo</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {rooms.length} {rooms.length === 1 ? "room" : "rooms"} available
            </span>
          </div>

          {property.description && (
            <p className="text-muted leading-relaxed max-w-3xl">{property.description}</p>
          )}
        </div>

        {/* Divider */}
        <hr className="border-card-border mb-8" />

        {/* Available Rooms */}
        <h2 className="text-2xl font-bold mb-6">Available Rooms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const amenities = parseAmenities(room.amenities);

            return (
              <Link
                key={room.id}
                href={`/listings/${room.id}`}
                className="card card-hover p-0 overflow-hidden block group"
              >
                {/* Room Photo or Placeholder */}
                {room.photo_url ? (
                  <img
                    src={room.photo_url}
                    alt={`${room.room_number}`}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-gradient-start/80 via-gradient-mid/80 to-gradient-end/80 flex items-center justify-center">
                    <span className="text-white/80 text-4xl font-light">
                      {room.room_number}
                    </span>
                  </div>
                )}

                <div className="p-5">
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-accent">${room.price}</span>
                    <span className="text-sm text-muted">/mo</span>
                  </div>

                  {/* Room Info */}
                  <h3 className="font-semibold text-lg group-hover:text-accent transition-colors mb-3">
                    {room.room_number}
                  </h3>

                  {/* Amenities */}
                  {amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {amenities.slice(0, 4).map((amenity) => (
                        <span key={amenity} className="badge bg-accent-light text-accent">
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

                  {/* CTA */}
                  <div className="text-sm font-medium text-accent group-hover:underline">
                    View & Apply →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
