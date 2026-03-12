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
      name: "Sunrise House",
      address: "42 Victoria Street, Newtown, Wellington 6021",
      description:
        "A vibrant co-living space in the heart of Newtown. Walking distance to cafes, parks, and public transport.",
    },
    {
      name: "Harbour View Lodge",
      address: "15 Oriental Parade, Oriental Bay, Wellington 6011",
      description:
        "Premium waterfront co-living with stunning harbour views. Modern amenities and a rooftop terrace.",
    },
    {
      name: "The Green Commons",
      address: "88 Cuba Street, Te Aro, Wellington 6011",
      description:
        "Eco-friendly co-living on Cuba Street. Shared garden, composting, and community kitchen.",
    },
  ];

  const propertyIds: number[] = [];
  const insertProperty = db.prepare(
    "INSERT INTO properties (name, address, description) VALUES (?, ?, ?) RETURNING id"
  );

  for (const p of properties) {
    const result = insertProperty.get(p.name, p.address, p.description) as { id: number };
    propertyIds.push(result.id);
  }

  console.log(`Created ${propertyIds.length} properties`);

  // ─── Rooms ─────────────────────────────────────────────────────────────────

  const roomData: { property_index: number; room_number: string; price: number; amenities: string; description: string }[] = [
    // Sunrise House — 3 rooms
    {
      property_index: 0,
      room_number: "S1",
      price: 180,
      amenities: JSON.stringify(["WiFi", "Desk", "Wardrobe", "Shared bathroom"]),
      description: "Cozy single room on the ground floor with garden access.",
    },
    {
      property_index: 0,
      room_number: "S2",
      price: 200,
      amenities: JSON.stringify(["WiFi", "Desk", "Wardrobe", "En-suite bathroom"]),
      description: "Spacious room with en-suite and morning sun.",
    },
    {
      property_index: 0,
      room_number: "S3",
      price: 165,
      amenities: JSON.stringify(["WiFi", "Desk", "Shared bathroom"]),
      description: "Compact room ideal for students. Quiet side of the house.",
    },
    // Harbour View Lodge — 4 rooms
    {
      property_index: 1,
      room_number: "H1",
      price: 250,
      amenities: JSON.stringify(["WiFi", "Desk", "En-suite bathroom", "Sea view", "Balcony"]),
      description: "Premium corner room with panoramic harbour views and private balcony.",
    },
    {
      property_index: 1,
      room_number: "H2",
      price: 230,
      amenities: JSON.stringify(["WiFi", "Desk", "En-suite bathroom", "Sea view"]),
      description: "Front-facing room with harbour glimpses through large windows.",
    },
    {
      property_index: 1,
      room_number: "H3",
      price: 195,
      amenities: JSON.stringify(["WiFi", "Desk", "Shared bathroom"]),
      description: "Rear-facing room with city views. Shared modern bathroom.",
    },
    {
      property_index: 1,
      room_number: "H4",
      price: 210,
      amenities: JSON.stringify(["WiFi", "Desk", "En-suite bathroom"]),
      description: "Mid-level room with en-suite and built-in storage.",
    },
    // The Green Commons — 3 rooms
    {
      property_index: 2,
      room_number: "G1",
      price: 190,
      amenities: JSON.stringify(["WiFi", "Desk", "Shared bathroom", "Garden access"]),
      description: "Ground floor room opening onto the shared garden.",
    },
    {
      property_index: 2,
      room_number: "G2",
      price: 175,
      amenities: JSON.stringify(["WiFi", "Desk", "Shared bathroom"]),
      description: "Upper level room with skylight and cross-ventilation.",
    },
    {
      property_index: 2,
      room_number: "G3",
      price: 185,
      amenities: JSON.stringify(["WiFi", "Desk", "Shared bathroom", "Standing desk"]),
      description: "Corner room with two windows and dedicated workspace nook.",
    },
  ];

  const roomIds: number[] = [];
  const insertRoom = db.prepare(
    `INSERT INTO rooms (property_id, room_number, price, amenities, description)
     VALUES (?, ?, ?, ?, ?) RETURNING id`
  );

  for (const r of roomData) {
    const result = insertRoom.get(
      propertyIds[r.property_index],
      r.room_number,
      r.price,
      r.amenities,
      r.description
    ) as { id: number };
    roomIds.push(result.id);
  }

  console.log(`Created ${roomIds.length} rooms`);

  // ─── Tenants ───────────────────────────────────────────────────────────────

  const tenantData = [
    { name: "Alice Chen", email: "alice.chen@email.com", phone: "021-555-0101", room_index: 0, move_in_date: "2025-11-01" },
    { name: "Ben Kowalski", email: "ben.k@email.com", phone: "021-555-0102", room_index: 1, move_in_date: "2025-12-15" },
    { name: "Chloe Ramirez", email: "chloe.r@email.com", phone: "021-555-0103", room_index: 3, move_in_date: "2026-01-05" },
    { name: "David Okonkwo", email: "david.o@email.com", phone: "021-555-0104", room_index: 4, move_in_date: "2025-10-20" },
    { name: "Emma Fitzgerald", email: "emma.f@email.com", phone: "021-555-0105", room_index: 7, move_in_date: "2026-02-01" },
    { name: "Finn Johansson", email: "finn.j@email.com", phone: "021-555-0106", room_index: 9, move_in_date: "2026-01-10" },
  ];

  const tenantIds: number[] = [];
  const insertTenant = db.prepare(
    `INSERT INTO tenants (name, email, phone, room_id, move_in_date)
     VALUES (?, ?, ?, ?, ?) RETURNING id`
  );
  const markOccupied = db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?");

  for (const t of tenantData) {
    const roomId = roomIds[t.room_index];
    const result = insertTenant.get(t.name, t.email, t.phone, roomId, t.move_in_date) as {
      id: number;
    };
    tenantIds.push(result.id);
    markOccupied.run(roomId);
  }

  console.log(`Created ${tenantIds.length} tenants (rooms marked occupied)`);

  // ─── Payments (March 2026) ─────────────────────────────────────────────────

  const insertPayment = db.prepare(
    `INSERT INTO payments (tenant_id, amount, due_date, paid_date, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  // Room prices by tenant index: S1=180, S2=200, H1=250, H2=230, G1=190, G3=185
  const prices = [180, 200, 250, 230, 190, 185];

  const paymentData = [
    // Alice — paid on time
    { tenant_index: 0, due_date: "2026-03-01", paid_date: "2026-03-01", status: "paid", notes: "Bank transfer" },
    // Ben — paid late
    { tenant_index: 1, due_date: "2026-03-01", paid_date: "2026-03-05", status: "paid", notes: "Cash payment" },
    // Chloe — overdue
    { tenant_index: 2, due_date: "2026-03-01", paid_date: null, status: "overdue", notes: "Reminder sent 2026-03-07" },
    // David — paid
    { tenant_index: 3, due_date: "2026-03-01", paid_date: "2026-03-02", status: "paid", notes: "Auto-debit" },
    // Emma — upcoming (mid-month billing)
    { tenant_index: 4, due_date: "2026-03-15", paid_date: null, status: "upcoming", notes: null },
    // Finn — upcoming
    { tenant_index: 5, due_date: "2026-03-15", paid_date: null, status: "upcoming", notes: null },

    // Also add February payments (all paid) for history
    { tenant_index: 0, due_date: "2026-02-01", paid_date: "2026-02-01", status: "paid", notes: "Bank transfer" },
    { tenant_index: 1, due_date: "2026-02-01", paid_date: "2026-02-03", status: "paid", notes: "Cash payment" },
    { tenant_index: 2, due_date: "2026-02-01", paid_date: "2026-02-01", status: "paid", notes: "Bank transfer" },
    { tenant_index: 3, due_date: "2026-02-01", paid_date: "2026-02-01", status: "paid", notes: "Auto-debit" },
  ];

  let paymentCount = 0;
  for (const p of paymentData) {
    insertPayment.run(
      tenantIds[p.tenant_index],
      prices[p.tenant_index],
      p.due_date,
      p.paid_date,
      p.status,
      p.notes
    );
    paymentCount++;
  }

  console.log(`Created ${paymentCount} payment records`);
  console.log("\nSeed complete!");
}

seed();
