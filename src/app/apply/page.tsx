import { getPublicVacantRooms, getPublicProperties } from "@/lib/actions";
import { PublicHeader } from "@/app/components/PublicHeader";
import { PublicFooter } from "@/app/components/PublicFooter";
import { ApplyForm } from "./ApplyForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apply — Fruitful Rooms",
  description: "Apply for a furnished room or home for rent in Florida. Fill out our quick application and we'll reach out within 1-2 business days.",
  openGraph: {
    title: "Apply — Fruitful Rooms",
    description: "Furnished rooms and homes starting at $650/month in Orlando, Daytona Beach, Ormond Beach, and Mulberry FL. Apply online.",
    url: "https://fruitfulrooms.com/apply",
  },
  alternates: { canonical: "https://fruitfulrooms.com/apply" },
};

export default async function ApplyPage() {
  const [rooms, allProperties] = await Promise.all([
    getPublicVacantRooms(),
    getPublicProperties(),
  ]);

  // Group co-living rooms by property
  const properties = new Map<string, { name: string; city: string; rentalType: "co-living" | "whole-house"; propertyId?: number; price?: number | null; rooms: typeof rooms }>();
  for (const room of rooms) {
    const key = room.property_name;
    if (!properties.has(key)) {
      properties.set(key, { name: room.property_name, city: room.property_city, rentalType: "co-living", rooms: [] });
    }
    properties.get(key)!.rooms.push(room);
  }

  // Add whole-house properties (no rooms)
  for (const prop of allProperties) {
    if (prop.rental_type === "whole-house" && prop.status === "available") {
      properties.set(prop.name, {
        name: prop.name,
        city: prop.city,
        rentalType: "whole-house",
        propertyId: prop.id,
        price: prop.price,
        rooms: [],
      });
    }
  }

  const propertyList = Array.from(properties.values());

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Rental Application</h1>
        <p className="text-muted mb-6">
          Interested in one of our properties? Fill out the application below and we&apos;ll
          reach out within 1-2 business days to schedule a call.
        </p>

        <ApplyForm properties={propertyList} />
      </main>

      <PublicFooter />
    </div>
  );
}
