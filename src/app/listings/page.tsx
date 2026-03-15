import Link from "next/link";
import { getPublicProperties } from "@/lib/actions";
import { PublicHeader } from "@/app/components/PublicHeader";
import { PublicFooter } from "@/app/components/PublicFooter";

export const metadata = {
  title: "Available Rooms for Rent in Florida",
  description: "Browse furnished rooms for rent in Orlando, Daytona Beach, Ormond Beach, and Mulberry FL. Utilities included, no deposit. Starting at $650/month. Apply online.",
  openGraph: {
    title: "Available Rooms for Rent — Fruitful Rooms",
    description: "Furnished rooms starting at $650/month. All utilities included. Browse and apply online.",
    url: "https://fruitfulrooms.com/listings",
  },
  alternates: { canonical: "https://fruitfulrooms.com/listings" },
};

export default async function ListingsPage() {
  const properties = await getPublicProperties();

  const totalRooms = properties.reduce((sum, p) => sum + p.vacant_count, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Our Properties</h1>
        <p className="text-muted mb-8">
          {totalRooms} {totalRooms === 1 ? "room" : "rooms"} available across{" "}
          {properties.length} {properties.length === 1 ? "property" : "properties"}
        </p>

        {properties.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/listings/property/${property.id}`}
                className="card card-hover p-0 overflow-hidden block group"
              >
                {/* Property Photo or Gradient */}
                {property.photo_url ? (
                  <img
                    src={property.photo_url}
                    alt={property.name}
                    className="w-full h-52 object-cover"
                  />
                ) : (
                  <div className="w-full h-52 bg-gradient-to-br from-gradient-start via-gradient-mid to-gradient-end flex items-center justify-center">
                    <span className="text-white/80 text-4xl font-light">
                      {property.name}
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Property Name & City */}
                  <h2 className="text-xl font-bold group-hover:text-accent transition-colors mb-1">
                    {property.name}
                  </h2>
                  <p className="text-sm text-muted mb-4">{property.city}</p>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-accent">
                        ${property.min_price}
                      </span>
                      <span className="text-sm text-muted">/mo</span>
                    </div>
                    <span className="text-sm text-muted">•</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {property.vacant_count} {property.vacant_count === 1 ? "room" : "rooms"} available
                    </span>
                  </div>

                  {/* Description Preview */}
                  {property.description && (
                    <p className="text-sm text-muted line-clamp-2 mb-4">
                      {property.description}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="text-sm font-medium text-accent group-hover:underline">
                    View Rooms →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
