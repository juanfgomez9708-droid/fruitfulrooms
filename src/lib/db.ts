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
        "Spacious two-story co-living home located about 15 minutes from the Daytona Beach shoreline. Comfortable shared living with modern amenities and convenient access to major roads, shopping, and hospitals. Approx. 2,600 sq ft two-story single-family home with 8 bedrooms and 2 bathrooms (one private). Shared amenities include washer/dryer, central AC, shared kitchen, living room, backyard, parking in front, smart locks, and outdoor security cameras. Utilities included: Wi-Fi, electricity, water. Move-in fee: $199, no security deposit.",
    },
  ];

  const roomAmenities = JSON.stringify([
    "Bed with mattress", "Nightstand", "Work desk", "Closet space", "Wi-Fi", "Electricity", "Water",
  ]);

  // [property_index, total_rooms, occupied_rooms]
  const roomCounts: [number, number, number][] = [
    [0, 4, 2],  // Woodcrest: 4 rooms, 2 occupied
    [1, 8, 3],  // Continental: 8 rooms, 3 occupied
    [2, 5, 1],  // Shady Acres: 5 rooms, 1 occupied
    [3, 8, 7],  // Cadillac: 8 rooms, 7 occupied
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

  for (const [propIdx, totalRooms, occupiedRooms] of roomCounts) {
    for (let i = 1; i <= totalRooms; i++) {
      const status = i <= occupiedRooms ? "occupied" : "vacant";
      insertRoom.run(propertyIds[propIdx], `Room ${i}`, 750, status, roomAmenities, "Fully furnished room");
    }
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
}
