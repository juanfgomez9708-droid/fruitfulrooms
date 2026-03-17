import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DB_DIR = join(process.cwd(), "data");
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
