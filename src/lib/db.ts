import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DB_DIR = process.env.DB_PATH ? process.env.DB_PATH : join(process.cwd(), "data");
const DB_PATH = join(DB_DIR, "coliving.db");

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;

  // Ensure the data directory exists
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH, { create: true });

  // Enable WAL mode for better concurrent read performance
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  // Initialize schema
  initSchema(db);

  // Migration: add city column if missing
  try {
    db.run("ALTER TABLE properties ADD COLUMN city TEXT NOT NULL DEFAULT ''");
  } catch {
    // Column already exists
  }

  // Auto-seed if database is empty (first deploy)
  const count = (db.query("SELECT COUNT(*) as count FROM properties").get() as { count: number }).count;
  if (count === 0) {
    seedProperties(db);
  }

  // Migrations: Update room prices and statuses for live DB (2026-03-15)
  migrateContientalRooms(db);
  migrateWoodcrestRooms(db);
  migrateShadyAcresRooms(db);
  migrateCadillacRooms(db);

  // Migration: Fix Cadillac House description — 3 shared bathrooms, not 2 (one private)
  migrateCadillacDescription(db);

  // Migration: add photos column to rooms (JSON array of photo paths)
  try {
    db.run("ALTER TABLE rooms ADD COLUMN photos TEXT");
  } catch {
    // Column already exists
  }

  // Migration: Cadillac House photos (2026-03-16)
  migrateCadillacPhotos(db);

  // Migration: Seed existing tenants (2026-03-18)
  migrateTenants(db);

  // Migration: Fix Woodcrest move-in dates (2026-03-18)
  migrateFixWoodcrestDates(db);

  // Migration: Move Dequan Pace from Room 6 to Room 7 at Cadillac (2026-03-18)
  migrateFixDequanRoom(db);

  return db;
}

function seedProperties(db: Database): void {
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

  const roomAmenities = JSON.stringify([
    "Bed with mattress", "Nightstand", "Work desk", "Closet space", "Wi-Fi", "Electricity", "Water",
  ]);

  // Per-room pricing for properties with varied rates
  const perRoomData: { propIndex: number; room: string; price: number; status: string }[] = [
    // Woodcrest — 4 rooms
    { propIndex: 0, room: "Room 1", price: 650, status: "vacant" },
    { propIndex: 0, room: "Room 2", price: 700, status: "occupied" },
    { propIndex: 0, room: "Room 3", price: 750, status: "vacant" },
    { propIndex: 0, room: "Room 4", price: 950, status: "occupied" },
    // Continental — 8 rooms
    { propIndex: 1, room: "Room 1", price: 650, status: "vacant" },
    { propIndex: 1, room: "Room 2", price: 850, status: "occupied" },
    { propIndex: 1, room: "Room 3", price: 850, status: "vacant" },
    { propIndex: 1, room: "Room 4", price: 800, status: "occupied" },
    { propIndex: 1, room: "Room 5", price: 850, status: "vacant" },
    { propIndex: 1, room: "Room 6", price: 850, status: "vacant" },
    { propIndex: 1, room: "Room 7", price: 850, status: "vacant" },
    { propIndex: 1, room: "Room 8", price: 750, status: "occupied" },
    // Shady Acres — 5 rooms
    { propIndex: 2, room: "Room 1", price: 800, status: "vacant" },
    { propIndex: 2, room: "Room 2", price: 800, status: "occupied" },
    { propIndex: 2, room: "Room 3", price: 700, status: "vacant" },
    { propIndex: 2, room: "Room 4", price: 750, status: "vacant" },
    { propIndex: 2, room: "Room 5", price: 850, status: "vacant" },
    // Cadillac — 8 rooms
    { propIndex: 3, room: "Room 1", price: 820, status: "occupied" },
    { propIndex: 3, room: "Room 2", price: 772, status: "occupied" },
    { propIndex: 3, room: "Room 3", price: 740, status: "occupied" },
    { propIndex: 3, room: "Room 4", price: 756, status: "occupied" },
    { propIndex: 3, room: "Room 5", price: 820, status: "occupied" },
    { propIndex: 3, room: "Room 6", price: 744, status: "vacant" },
    { propIndex: 3, room: "Room 7", price: 776, status: "occupied" },
    { propIndex: 3, room: "Room 8", price: 772, status: "occupied" },
  ];

  const insertProperty = db.prepare(
    "INSERT INTO properties (name, address, city, description) VALUES (?, ?, ?, ?) RETURNING id"
  );
  const insertRoom = db.prepare(
    `INSERT INTO rooms (property_id, room_number, price, status, amenities, description) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const propertyIds: number[] = [];
  for (const p of properties) {
    const result = insertProperty.get(p.name, p.address, p.city, p.description) as { id: number };
    propertyIds.push(result.id);
  }

  // All properties — per-room pricing
  for (const r of perRoomData) {
    insertRoom.run(propertyIds[r.propIndex], r.room, r.price, r.status, roomAmenities, "Fully furnished room");
  }
}

function migrateCadillacRooms(db: Database): void {
  const cadillac = db.query("SELECT id FROM properties WHERE name = 'Cadillac House'").get() as { id: number } | null;
  if (!cadillac) return;

  const room1 = db.query(
    "SELECT id, price FROM rooms WHERE property_id = ? AND room_number = 'Room 1'"
  ).get(cadillac.id) as { id: number; price: number } | null;

  // Skip if already migrated (Room 1 should be $820, not $750)
  if (!room1 || room1.price !== 750) return;

  const updates: { room: string; price: number; status: string }[] = [
    { room: "Room 1", price: 820, status: "occupied" },
    { room: "Room 2", price: 772, status: "occupied" },
    { room: "Room 3", price: 740, status: "occupied" },
    { room: "Room 4", price: 756, status: "occupied" },
    { room: "Room 5", price: 820, status: "occupied" },
    { room: "Room 6", price: 744, status: "vacant" },
    { room: "Room 7", price: 776, status: "occupied" },
    { room: "Room 8", price: 772, status: "occupied" },
  ];

  const stmt = db.prepare(
    "UPDATE rooms SET price = ?, status = ? WHERE property_id = ? AND room_number = ?"
  );
  for (const u of updates) {
    stmt.run(u.price, u.status, cadillac.id, u.room);
  }
}

function migrateShadyAcresRooms(db: Database): void {
  const shadyAcres = db.query("SELECT id FROM properties WHERE name = 'Shady Acres House'").get() as { id: number } | null;
  if (!shadyAcres) return;

  const room1 = db.query(
    "SELECT id, price FROM rooms WHERE property_id = ? AND room_number = 'Room 1'"
  ).get(shadyAcres.id) as { id: number; price: number } | null;

  // Skip if already migrated (Room 1 should be $800, not $750)
  if (!room1 || room1.price !== 750) return;

  const updates: { room: string; price: number; status: string }[] = [
    { room: "Room 1", price: 800, status: "vacant" },
    { room: "Room 2", price: 800, status: "occupied" },
    { room: "Room 3", price: 700, status: "vacant" },
    { room: "Room 4", price: 750, status: "vacant" },
    { room: "Room 5", price: 850, status: "vacant" },
  ];

  const stmt = db.prepare(
    "UPDATE rooms SET price = ?, status = ? WHERE property_id = ? AND room_number = ?"
  );
  for (const u of updates) {
    stmt.run(u.price, u.status, shadyAcres.id, u.room);
  }
}

function migrateWoodcrestRooms(db: Database): void {
  const woodcrest = db.query("SELECT id FROM properties WHERE name = 'Woodcrest House'").get() as { id: number } | null;
  if (!woodcrest) return;

  const room1 = db.query(
    "SELECT id, price FROM rooms WHERE property_id = ? AND room_number = 'Room 1'"
  ).get(woodcrest.id) as { id: number; price: number } | null;

  // Skip if already migrated (Room 1 should be $650, not $750)
  if (!room1 || room1.price !== 750) return;

  const updates: { room: string; price: number; status: string }[] = [
    { room: "Room 1", price: 650, status: "vacant" },
    { room: "Room 2", price: 700, status: "occupied" },
    { room: "Room 3", price: 750, status: "vacant" },
    { room: "Room 4", price: 950, status: "occupied" },
  ];

  const stmt = db.prepare(
    "UPDATE rooms SET price = ?, status = ? WHERE property_id = ? AND room_number = ?"
  );
  for (const u of updates) {
    stmt.run(u.price, u.status, woodcrest.id, u.room);
  }
}

function migrateContientalRooms(db: Database): void {
  // Idempotent: only runs if Continental rooms still have old flat pricing
  const continental = db.query("SELECT id FROM properties WHERE name = 'Continental House'").get() as { id: number } | null;
  if (!continental) return;

  const room1 = db.query(
    "SELECT id, price FROM rooms WHERE property_id = ? AND room_number = 'Room 1'"
  ).get(continental.id) as { id: number; price: number } | null;

  // Skip if already migrated (Room 1 should be $650, not $750)
  if (!room1 || room1.price !== 750) return;

  const updates: { room: string; price: number; status: string }[] = [
    { room: "Room 1", price: 650, status: "vacant" },
    { room: "Room 2", price: 850, status: "occupied" },
    { room: "Room 3", price: 850, status: "vacant" },
    { room: "Room 4", price: 800, status: "occupied" },
    { room: "Room 5", price: 850, status: "vacant" },
    { room: "Room 6", price: 850, status: "vacant" },
    { room: "Room 7", price: 850, status: "vacant" },
    { room: "Room 8", price: 750, status: "occupied" },
  ];

  const stmt = db.prepare(
    "UPDATE rooms SET price = ?, status = ? WHERE property_id = ? AND room_number = ?"
  );
  for (const u of updates) {
    stmt.run(u.price, u.status, continental.id, u.room);
  }
}

function migrateCadillacDescription(db: Database): void {
  const cadillac = db.query("SELECT id, description FROM properties WHERE name = 'Cadillac House'").get() as { id: number; description: string | null } | null;
  if (!cadillac || !cadillac.description) return;

  // Only run if still has old description
  if (!cadillac.description.includes("2 bathrooms (one private)")) return;

  const newDesc = cadillac.description.replace("2 bathrooms (one private)", "3 shared bathrooms");
  db.prepare("UPDATE properties SET description = ? WHERE id = ?").run(newDesc, cadillac.id);
}

function migrateCadillacPhotos(db: Database): void {
  const cadillac = db.query("SELECT id FROM properties WHERE name = 'Cadillac House'").get() as { id: number } | null;
  if (!cadillac) return;

  // Set property hero photo (house exterior)
  const prop = db.query("SELECT photo_url FROM properties WHERE id = ?").get(cadillac.id) as { photo_url: string | null } | null;
  if (prop && !prop.photo_url) {
    db.prepare("UPDATE properties SET photo_url = ? WHERE id = ?").run("/photos/cadillac-house/12-house.jpg", cadillac.id);
  }

  // Set Room 6 photos (ordered: bedroom, kitchen, bathroom, house, hallway, washer/dryer)
  const room6 = db.query(
    "SELECT id, photos FROM rooms WHERE property_id = ? AND room_number = 'Room 6'"
  ).get(cadillac.id) as { id: number; photos: string | null } | null;

  if (room6 && !room6.photos) {
    const photos = JSON.stringify([
      "/photos/cadillac-house/01-bedroom.jpg",
      "/photos/cadillac-house/02-bedroom.jpg",
      "/photos/cadillac-house/03-bedroom.jpg",
      "/photos/cadillac-house/04-bedroom.jpg",
      "/photos/cadillac-house/05-kitchen.jpg",
      "/photos/cadillac-house/06-kitchen.jpg",
      "/photos/cadillac-house/07-kitchen.jpg",
      "/photos/cadillac-house/08-bathroom.jpg",
      "/photos/cadillac-house/09-bathroom.jpg",
      "/photos/cadillac-house/10-bathroom.jpg",
      "/photos/cadillac-house/11-bathroom.jpg",
      "/photos/cadillac-house/12-house.jpg",
      "/photos/cadillac-house/13-hallway.jpg",
      "/photos/cadillac-house/14-washer-dryer.jpg",
    ]);
    db.prepare("UPDATE rooms SET photos = ?, photo_url = ? WHERE id = ?").run(photos, "/photos/cadillac-house/01-bedroom.jpg", room6.id);
  }
}

function migrateTenants(db: Database): void {
  // Only run if no tenants exist yet
  const count = (db.query("SELECT COUNT(*) as count FROM tenants").get() as { count: number }).count;
  if (count > 0) return;

  const tenants = [
    // Woodcrest House
    { property: "Woodcrest House", room: "Room 2", name: "John Painter", email: "shadoteam03@gmail.com", phone: "(321) 262-5320", move_in_date: "2025-11-01" },
    { property: "Woodcrest House", room: "Room 4", name: "Jack Bulson Jr", email: "jackbulson2@gmail.com", phone: "(407) 435-9127", move_in_date: "2024-06-01" },
    // Continental House
    { property: "Continental House", room: "Room 2", name: "Antawuan Tramain Forrest Sr", email: "Wethebest1982@gmail.com", phone: "(321) 557-8278", move_in_date: "2024-10-01" },
    { property: "Continental House", room: "Room 4", name: "George Alberto Carrillo", email: "gteknet@gmail.com", phone: "(407) 900-1750", move_in_date: "2024-01-01" },
    { property: "Continental House", room: "Room 8", name: "Demair Maitland", email: "dem.air@hotmail.com", phone: "(954) 831-9337", move_in_date: "2024-03-01" },
    // Shady Acres House
    { property: "Shady Acres House", room: "Room 2", name: "Onel Lopez Pacheco", email: "chagui83@gmail.com", phone: "(813) 713-6913", move_in_date: "2024-09-01" },
    // Cadillac House
    { property: "Cadillac House", room: "Room 1", name: "Cassandra Reinoso", email: null, phone: "(904) 850-2961", move_in_date: "2026-02-01" },
    { property: "Cadillac House", room: "Room 2", name: "Doris Dixon", email: null, phone: "(630) 391-1495", move_in_date: "2025-08-01" },
    { property: "Cadillac House", room: "Room 3", name: "Amya Bourgeois", email: null, phone: "(832) 423-2890", move_in_date: "2025-09-01" },
    { property: "Cadillac House", room: "Room 4", name: "Tristen Saunders-Hall", email: null, phone: "(718) 219-8150", move_in_date: "2026-01-01" },
    { property: "Cadillac House", room: "Room 5", name: "Austin Ash", email: null, phone: "(386) 523-8765", move_in_date: "2026-01-01" },
    { property: "Cadillac House", room: "Room 7", name: "Dequan Pace", email: null, phone: "(352) 494-2916", move_in_date: "2026-02-02" },
    { property: "Cadillac House", room: "Room 8", name: "Anthony Bryant", email: null, phone: "(386) 220-1043", move_in_date: "2025-11-01" },
  ];

  const findRoom = db.prepare(
    "SELECT r.id FROM rooms r JOIN properties p ON r.property_id = p.id WHERE p.name = ? AND r.room_number = ?"
  );
  const insertTenant = db.prepare(
    "INSERT INTO tenants (name, email, phone, room_id, move_in_date, status) VALUES (?, ?, ?, ?, ?, 'active')"
  );
  const updateRoom = db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?");

  for (const t of tenants) {
    const room = findRoom.get(t.property, t.room) as { id: number } | null;
    if (!room) continue;
    insertTenant.run(t.name, t.email, t.phone, room.id, t.move_in_date);
    updateRoom.run(room.id);
  }
}

function migrateFixDequanRoom(db: Database): void {
  const cadillac = db.query("SELECT id FROM properties WHERE name = 'Cadillac House'").get() as { id: number } | null;
  if (!cadillac) return;

  const room6 = db.query("SELECT id FROM rooms WHERE property_id = ? AND room_number = 'Room 6'").get(cadillac.id) as { id: number } | null;
  const room7 = db.query("SELECT id FROM rooms WHERE property_id = ? AND room_number = 'Room 7'").get(cadillac.id) as { id: number } | null;
  if (!room6 || !room7) return;

  // Check if Dequan is still assigned to Room 6
  const dequan = db.query("SELECT id, room_id FROM tenants WHERE name = 'Dequan Pace'").get() as { id: number; room_id: number } | null;
  if (!dequan || dequan.room_id !== room6.id) return;

  // Move Dequan to Room 7, set Room 6 vacant, Room 7 occupied
  db.prepare("UPDATE tenants SET room_id = ? WHERE id = ?").run(room7.id, dequan.id);
  db.prepare("UPDATE rooms SET status = 'vacant' WHERE id = ?").run(room6.id);
  db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(room7.id);
}

function migrateFixWoodcrestDates(db: Database): void {
  // Fix: John Painter move-in = Nov 2025, Jack Bulson Jr = June 2024
  const john = db.query("SELECT id, move_in_date FROM tenants WHERE name = 'John Painter'").get() as { id: number; move_in_date: string | null } | null;
  if (john && !john.move_in_date) {
    db.prepare("UPDATE tenants SET move_in_date = ? WHERE id = ?").run("2025-11-01", john.id);
  }
  const jack = db.query("SELECT id, move_in_date FROM tenants WHERE name = 'Jack Bulson Jr'").get() as { id: number; move_in_date: string | null } | null;
  if (jack && jack.move_in_date === "2025-11-01") {
    db.prepare("UPDATE tenants SET move_in_date = ? WHERE id = ?").run("2024-06-01", jack.id);
  }
}

function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      description TEXT,
      photo_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      room_number TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'vacant',
      amenities TEXT,
      photo_url TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
      move_in_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      employment_status TEXT NOT NULL,
      income_range TEXT NOT NULL,
      desired_move_in TEXT NOT NULL,
      occupants TEXT NOT NULL DEFAULT '1',
      has_pets TEXT NOT NULL DEFAULT 'no',
      background_check_consent TEXT NOT NULL DEFAULT 'no',
      about TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      paid_date TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Indexes for common query patterns
  db.run(`CREATE INDEX IF NOT EXISTS idx_rooms_property_status ON rooms(property_id, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_inquiries_room_id ON inquiries(room_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON tenants(room_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_property_month ON expenses(property_id, month)`);
}
