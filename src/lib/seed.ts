import { getDb } from "./db";

function seed() {
  const db = getDb();

  // Clear existing data (order matters for foreign keys)
  db.run("DELETE FROM payments");
  db.run("DELETE FROM tenants");
  db.run("DELETE FROM rooms");
  db.run("DELETE FROM properties");

  // ─── Properties ──────────────────────────────────────────────────────────────

  const properties = [
    {
      name: "Woodcrest House",
      address: "1815 Woodcrest Dr, Ormond Beach, FL 32174",
      city: "Ormond Beach, FL",
      description:
        "Comfortable and affordable furnished rooms in a clean co-living home located just 15 minutes from the beach. Close to major roads, shopping centers, grocery stores, and public transportation. Approx. 1,000 sq ft single-family home with 4 bedrooms and 2 bathrooms (one private). Shared amenities include washer/dryer, central AC, shared kitchen, living room, backyard, driveway and street parking, smart locks, and outdoor security cameras. Utilities included: Wi-Fi, electricity, water. Move-in fee: $199, no security deposit.",
    },
    {
      name: "Continental House",
      address: "2115 Continental Blvd, Orlando, FL 32808",
      city: "Orlando, FL",
      description:
        "Spacious co-living home located just 15 minutes from Downtown Orlando. Comfortable shared living with modern amenities and convenient access to major highways, grocery stores, and public transportation. Approx. 1,600 sq ft single-family home with 8 bedrooms and 2 bathrooms. Shared amenities include washer/dryer, central AC, shared kitchen, living room, backyard, driveway and street parking, smart locks, and outdoor security cameras. Utilities included: Wi-Fi, electricity, water. Move-in fee: $199, no security deposit.",
    },
    {
      name: "Shady Acres House",
      address: "2185 Shady Acres Dr, Mulberry, FL 33860",
      city: "Mulberry, FL",
      description:
        "Spacious co-living home located 15-20 minutes from Lakeland, Florida. Quiet and comfortable living environment with convenient access to major roads, grocery stores, and everyday essentials. Approx. 1,800 sq ft single-family home with 5 bedrooms and 2 bathrooms (one private). Shared amenities include washer/dryer, central AC, shared kitchen, living room, backyard, parking in front, smart locks, and outdoor security cameras. Utilities included: Wi-Fi, electricity, water. Move-in fee: $199, no security deposit.",
    },
    {
      name: "Cadillac House",
      address: "1241 Cadillac Dr, Daytona Beach, FL 32117",
      city: "Daytona Beach, FL",
      description:
        "Spacious two-story co-living home located about 15 minutes from the Daytona Beach shoreline. Comfortable shared living with modern amenities and convenient access to major roads, shopping, and hospitals. Approx. 2,600 sq ft two-story single-family home with 8 bedrooms and 3 shared bathrooms. Shared amenities include washer/dryer, central AC, shared kitchen, living room, backyard, parking in front, smart locks, and outdoor security cameras. Utilities included: Wi-Fi, electricity, water. Move-in fee: $199, no security deposit.",
    },
  ];

  const propertyIds: number[] = [];
  const insertProperty = db.prepare(
    "INSERT INTO properties (name, address, city, description) VALUES (?, ?, ?, ?) RETURNING id"
  );

  for (const p of properties) {
    const result = insertProperty.get(p.name, p.address, p.city, p.description) as { id: number };
    propertyIds.push(result.id);
  }

  console.log(`Created ${propertyIds.length} properties`);

  // ─── Rooms ─────────────────────────────────────────────────────────────────

  const roomAmenities = JSON.stringify([
    "Bed with mattress",
    "Nightstand",
    "Work desk",
    "Closet space",
    "Wi-Fi",
    "Electricity",
    "Water",
  ]);

  // Property 1: Woodcrest — 4 rooms, 2 vacant, 2 occupied
  // Property 2: Continental — 8 rooms, 5 vacant, 3 occupied
  // Property 3: Shady Acres — 5 rooms, 4 vacant, 1 occupied
  // Property 4: Cadillac — 8 rooms, 1 vacant, 7 occupied

  const roomData: { property_index: number; room_number: string; price: number; status: string }[] = [
    // Woodcrest — 4 rooms (2 occupied, 2 vacant)
    { property_index: 0, room_number: "Room 1", price: 650, status: "vacant" },
    { property_index: 0, room_number: "Room 2", price: 700, status: "occupied" },
    { property_index: 0, room_number: "Room 3", price: 750, status: "vacant" },
    { property_index: 0, room_number: "Room 4", price: 950, status: "occupied" },

    // Continental — 8 rooms (3 occupied, 5 vacant)
    { property_index: 1, room_number: "Room 1", price: 650, status: "vacant" },
    { property_index: 1, room_number: "Room 2", price: 850, status: "occupied" },
    { property_index: 1, room_number: "Room 3", price: 850, status: "vacant" },
    { property_index: 1, room_number: "Room 4", price: 800, status: "occupied" },
    { property_index: 1, room_number: "Room 5", price: 850, status: "vacant" },
    { property_index: 1, room_number: "Room 6", price: 850, status: "vacant" },
    { property_index: 1, room_number: "Room 7", price: 850, status: "vacant" },
    { property_index: 1, room_number: "Room 8", price: 750, status: "occupied" },

    // Shady Acres — 5 rooms (1 occupied, 4 vacant)
    { property_index: 2, room_number: "Room 1", price: 800, status: "vacant" },
    { property_index: 2, room_number: "Room 2", price: 800, status: "occupied" },
    { property_index: 2, room_number: "Room 3", price: 700, status: "vacant" },
    { property_index: 2, room_number: "Room 4", price: 750, status: "vacant" },
    { property_index: 2, room_number: "Room 5", price: 850, status: "vacant" },

    // Cadillac — 8 rooms (7 occupied, 1 vacant)
    { property_index: 3, room_number: "Room 1", price: 820, status: "occupied" },
    { property_index: 3, room_number: "Room 2", price: 772, status: "occupied" },
    { property_index: 3, room_number: "Room 3", price: 740, status: "occupied" },
    { property_index: 3, room_number: "Room 4", price: 756, status: "occupied" },
    { property_index: 3, room_number: "Room 5", price: 820, status: "occupied" },
    { property_index: 3, room_number: "Room 6", price: 744, status: "vacant" },
    { property_index: 3, room_number: "Room 7", price: 776, status: "occupied" },
    { property_index: 3, room_number: "Room 8", price: 772, status: "occupied" },
  ];

  const insertRoom = db.prepare(
    `INSERT INTO rooms (property_id, room_number, price, status, amenities, description)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  );

  let vacantCount = 0;
  let occupiedCount = 0;

  for (const r of roomData) {
    insertRoom.get(
      propertyIds[r.property_index],
      r.room_number,
      r.price,
      r.status,
      roomAmenities,
      "Fully furnished room"
    );
    if (r.status === "vacant") vacantCount++;
    else occupiedCount++;
  }

  console.log(`Created ${roomData.length} rooms (${vacantCount} vacant, ${occupiedCount} occupied)`);
  console.log("\nSeed complete!");
  console.log("\nSummary:");
  console.log("  Woodcrest House (Ormond Beach) — 4 rooms, 2 vacant");
  console.log("  Continental House (Orlando) — 8 rooms, 5 vacant (prices: $650-$850)");
  console.log("  Shady Acres House (Mulberry) — 5 rooms, 4 vacant");
  console.log("  Cadillac House (Daytona Beach) — 8 rooms, 1 vacant");
}

seed();
