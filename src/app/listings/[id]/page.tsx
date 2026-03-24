import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicRoom, getPublicProperty } from "@/lib/actions";
import { parseAmenities } from "@/lib/utils";
import { PublicHeader } from "@/app/components/PublicHeader";
import { PublicFooter } from "@/app/components/PublicFooter";
import { InquiryForm } from "./InquiryForm";
import { PhotoGallery } from "./PhotoGallery";

const getCachedRoom = cache((id: number) => getPublicRoom(id));
const getCachedProperty = cache((id: number) => getPublicProperty(id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getCachedRoom(Number(id));
  if (!room || room.status !== "vacant") {
    return { title: "Room Not Found" };
  }
  const property = await getCachedProperty(room.property_id);
  const city = property?.city ?? "Florida";
  const name = property?.name ?? "Fruitful Rooms";
  const title = `Furnished Room for Rent in ${city} — $${room.price}/mo at ${name}`;
  const description = `${room.room_number} at ${name} in ${city}. $${room.price}/month, all utilities included. Furnished, no deposit, no brokers. Apply online today.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://fruitfulrooms.com/listings/${id}`,
      type: "website",
    },
    alternates: { canonical: `https://fruitfulrooms.com/listings/${id}` },
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
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link href="/listings" className="hover:text-foreground transition-colors">
            Properties
          </Link>
          <span>/</span>
          <Link
            href={`/listings/property/${property?.id}`}
            className="hover:text-foreground transition-colors"
          >
            {property?.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{room.room_number}</span>
        </nav>

        {/* Photos */}
        {room.photos ? (
          <PhotoGallery
            photos={room.photos}
            alt={`${room.room_number} at ${property?.name}`}
          />
        ) : room.photo_url ? (
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
                <span className="text-muted">/mo</span>
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

          {/* Right Column — Inquiry Form */}
          <InquiryForm roomId={room.id} />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
