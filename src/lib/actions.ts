"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "./db";
import { requireAuth } from "./auth";
import { VALID_EMPLOYMENT, VALID_INCOME, INQUIRY_STATUSES, VALID_EXPENSE_CATEGORIES } from "./constants";
import { getCurrentMonth } from "./utils";
import type { Property, Room, Tenant, Payment, Inquiry, Expense, LockCode, DashboardStats } from "./types";
import { sendInquiryEmail } from "./email";

// ─── Properties ──────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
  await requireAuth();
  const db = getDb();
  return db.query("SELECT * FROM properties ORDER BY created_at DESC").all() as Property[];
}

export async function getProperty(id: number): Promise<Property | null> {
  await requireAuth();
  const db = getDb();
  return (db.query("SELECT * FROM properties WHERE id = ?").get(id) as Property) ?? null;
}

export async function createProperty(data: {
  name: string;
  address: string;
  city: string;
  description?: string;
  photo_url?: string;
}): Promise<Property> {
  await requireAuth();
  const db = getDb();
  const result = db
    .query(
      "INSERT INTO properties (name, address, city, description, photo_url) VALUES (?, ?, ?, ?, ?) RETURNING *"
    )
    .get(data.name, data.address, data.city, data.description ?? null, data.photo_url ?? null) as Property;
  revalidatePath("/admin/properties");
  revalidatePath("/admin");
  return result;
}

export async function updateProperty(
  id: number,
  data: { name?: string; address?: string; city?: string; description?: string; photo_url?: string }
): Promise<Property | null> {
  await requireAuth();
  const db = getDb();
  const existing = await getProperty(id);
  if (!existing) return null;

  const result = db
    .query(
      "UPDATE properties SET name = ?, address = ?, city = ?, description = ?, photo_url = ? WHERE id = ? RETURNING *"
    )
    .get(
      data.name ?? existing.name,
      data.address ?? existing.address,
      data.city ?? existing.city,
      data.description ?? existing.description,
      data.photo_url ?? existing.photo_url,
      id
    ) as Property;
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  revalidatePath("/admin");
  return result;
}

export async function deleteProperty(id: number): Promise<void> {
  await requireAuth();
  const db = getDb();
  db.query("DELETE FROM properties WHERE id = ?").run(id);
  revalidatePath("/admin/properties");
  revalidatePath("/admin");
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function getRooms(propertyId: number): Promise<Room[]> {
  await requireAuth();
  const db = getDb();
  return db
    .query("SELECT * FROM rooms WHERE property_id = ? ORDER BY room_number")
    .all(propertyId) as Room[];
}

export async function getAllRooms(): Promise<(Room & { property_name: string })[]> {
  await requireAuth();
  const db = getDb();
  return db
    .query(
      `SELECT r.*, p.name AS property_name
       FROM rooms r
       JOIN properties p ON r.property_id = p.id
       ORDER BY p.name, r.room_number`
    )
    .all() as (Room & { property_name: string })[];
}

export async function getRoom(id: number): Promise<Room | null> {
  await requireAuth();
  const db = getDb();
  return (db.query("SELECT * FROM rooms WHERE id = ?").get(id) as Room) ?? null;
}

export async function createRoom(data: {
  property_id: number;
  room_number: string;
  price: number;
  status?: string;
  amenities?: string;
  photo_url?: string;
  description?: string;
}): Promise<Room> {
  await requireAuth();
  const db = getDb();
  const result = db
    .query(
      `INSERT INTO rooms (property_id, room_number, price, status, amenities, photo_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .get(
      data.property_id,
      data.room_number,
      data.price,
      data.status ?? "vacant",
      data.amenities ?? null,
      data.photo_url ?? null,
      data.description ?? null
    ) as Room;
  revalidatePath(`/admin/properties/${data.property_id}`);
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/listings");
  return result;
}

export async function updateRoom(
  id: number,
  data: {
    room_number?: string;
    price?: number;
    status?: string;
    amenities?: string;
    photo_url?: string;
    description?: string;
  }
): Promise<Room | null> {
  await requireAuth();
  const db = getDb();
  const existing = await getRoom(id);
  if (!existing) return null;

  const result = db
    .query(
      `UPDATE rooms SET room_number = ?, price = ?, status = ?, amenities = ?, photo_url = ?, description = ?
       WHERE id = ? RETURNING *`
    )
    .get(
      data.room_number ?? existing.room_number,
      data.price ?? existing.price,
      data.status ?? existing.status,
      data.amenities ?? existing.amenities,
      data.photo_url ?? existing.photo_url,
      data.description ?? existing.description,
      id
    ) as Room;
  revalidatePath(`/admin/properties/${existing.property_id}`);
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/listings");
  return result;
}

export async function deleteRoom(id: number): Promise<void> {
  await requireAuth();
  const db = getDb();
  const room = await getRoom(id);
  db.query("DELETE FROM rooms WHERE id = ?").run(id);
  if (room) {
    revalidatePath(`/admin/properties/${room.property_id}`);
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/listings");
}

export async function getVacantRooms(): Promise<(Room & { property_name: string; property_city: string })[]> {
  const db = getDb();
  return db
    .query(
      `SELECT r.*, p.name AS property_name, p.city AS property_city
       FROM rooms r
       JOIN properties p ON r.property_id = p.id
       WHERE r.status = 'vacant'
       ORDER BY r.price ASC`
    )
    .all() as (Room & { property_name: string; property_city: string })[];
}

// ─── Public Read-Only (no auth required) ────────────────────────────────────

export async function getPublicRoom(id: number): Promise<Room | null> {
  const db = getDb();
  return (db.query("SELECT * FROM rooms WHERE id = ?").get(id) as Room) ?? null;
}

export async function getPublicProperty(id: number): Promise<Property | null> {
  const db = getDb();
  return (db.query("SELECT * FROM properties WHERE id = ?").get(id) as Property) ?? null;
}

export async function getPublicProperties(): Promise<(Property & { vacant_count: number; min_price: number })[]> {
  const db = getDb();
  return db
    .query(
      `SELECT p.*, COUNT(r.id) AS vacant_count, MIN(r.price) AS min_price
       FROM properties p
       JOIN rooms r ON r.property_id = p.id AND r.status = 'vacant'
       GROUP BY p.id
       HAVING vacant_count > 0
       ORDER BY p.name`
    )
    .all() as (Property & { vacant_count: number; min_price: number })[];
}

export async function getPropertyVacantRooms(propertyId: number): Promise<Room[]> {
  const db = getDb();
  return db
    .query("SELECT * FROM rooms WHERE property_id = ? AND status = 'vacant' ORDER BY price ASC")
    .all(propertyId) as Room[];
}

// ─── Tenants ─────────────────────────────────────────────────────────────────

export async function getTenants(): Promise<Tenant[]> {
  await requireAuth();
  const db = getDb();
  return db.query("SELECT * FROM tenants ORDER BY created_at DESC").all() as Tenant[];
}

export async function getTenantsWithRooms(propertyId?: number): Promise<
  (Tenant & { room_number: string; room_price: number; property_id: number; property_name: string })[]
> {
  await requireAuth();
  const db = getDb();
  let sql = `
    SELECT t.*, r.room_number, r.price AS room_price, r.property_id, p.name AS property_name
    FROM tenants t
    JOIN rooms r ON t.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE t.status = 'active'
  `;
  const params: number[] = [];
  if (propertyId) {
    sql += " AND r.property_id = ?";
    params.push(propertyId);
  }
  sql += " ORDER BY p.name, r.room_number";
  return db.query(sql).all(...params) as (Tenant & { room_number: string; room_price: number; property_id: number; property_name: string })[];
}

export async function getTenant(id: number): Promise<Tenant | null> {
  await requireAuth();
  const db = getDb();
  return (db.query("SELECT * FROM tenants WHERE id = ?").get(id) as Tenant) ?? null;
}

export async function createTenant(data: {
  name: string;
  email?: string;
  phone?: string;
  room_id?: number;
  move_in_date?: string;
  status?: string;
}): Promise<Tenant> {
  await requireAuth();
  const db = getDb();
  const result = db
    .query(
      `INSERT INTO tenants (name, email, phone, room_id, move_in_date, status)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .get(
      data.name,
      data.email ?? null,
      data.phone ?? null,
      data.room_id ?? null,
      data.move_in_date ?? null,
      data.status ?? "active"
    ) as Tenant;

  // Mark room as occupied if assigned
  if (data.room_id) {
    db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(data.room_id);
    revalidatePath("/listings");
  }

  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
  return result;
}

export async function updateTenant(
  id: number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    room_id?: number | null;
    move_in_date?: string;
    status?: string;
  }
): Promise<Tenant | null> {
  await requireAuth();
  const db = getDb();
  const existing = await getTenant(id);
  if (!existing) return null;

  // If room assignment changed, update room statuses
  const newRoomId = data.room_id !== undefined ? data.room_id : existing.room_id;
  if (existing.room_id !== newRoomId) {
    // Free old room
    if (existing.room_id) {
      db.query("UPDATE rooms SET status = 'vacant' WHERE id = ?").run(existing.room_id);
    }
    // Occupy new room
    if (newRoomId) {
      db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(newRoomId);
    }
    revalidatePath("/listings");
  }

  const result = db
    .query(
      `UPDATE tenants SET name = ?, email = ?, phone = ?, room_id = ?, move_in_date = ?, status = ?
       WHERE id = ? RETURNING *`
    )
    .get(
      data.name ?? existing.name,
      data.email ?? existing.email,
      data.phone ?? existing.phone,
      newRoomId,
      data.move_in_date ?? existing.move_in_date,
      data.status ?? existing.status,
      id
    ) as Tenant;
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${id}`);
  revalidatePath("/admin");
  return result;
}

export async function deleteTenant(id: number): Promise<void> {
  await requireAuth();
  const db = getDb();
  const tenant = await getTenant(id);

  // Free the room if tenant was assigned
  if (tenant?.room_id) {
    db.query("UPDATE rooms SET status = 'vacant' WHERE id = ?").run(tenant.room_id);
    revalidatePath("/listings");
  }

  db.query("DELETE FROM tenants WHERE id = ?").run(id);
  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function getPayments(tenantId?: number, propertyId?: number, startMonth?: string, endMonth?: string): Promise<Payment[]> {
  await requireAuth();
  const db = getDb();
  let sql: string;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (propertyId) {
    sql = "SELECT p.* FROM payments p JOIN tenants t ON p.tenant_id = t.id JOIN rooms r ON t.room_id = r.id";
    conditions.push("r.property_id = ?");
    params.push(propertyId);
  } else if (tenantId) {
    sql = "SELECT * FROM payments";
    conditions.push("tenant_id = ?");
    params.push(tenantId);
  } else {
    sql = "SELECT * FROM payments";
  }

  if (startMonth && endMonth && startMonth !== endMonth) {
    const alias = propertyId ? "p." : "";
    conditions.push(`strftime('%Y-%m', ${alias}due_date) >= ? AND strftime('%Y-%m', ${alias}due_date) <= ?`);
    params.push(startMonth, endMonth);
  } else if (startMonth) {
    const alias = propertyId ? "p." : "";
    conditions.push(`strftime('%Y-%m', ${alias}due_date) = ?`);
    params.push(startMonth);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  const alias = propertyId ? "p." : "";
  sql += ` ORDER BY ${alias}due_date DESC`;

  return db.query(sql).all(...params) as Payment[];
}

export async function createPayment(data: {
  tenant_id: number;
  amount: number;
  due_date: string;
  paid_date?: string;
  status?: string;
  notes?: string;
}): Promise<Payment> {
  await requireAuth();
  const db = getDb();
  const result = db
    .query(
      `INSERT INTO payments (tenant_id, amount, due_date, paid_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .get(
      data.tenant_id,
      data.amount,
      data.due_date,
      data.paid_date ?? null,
      data.status ?? "upcoming",
      data.notes ?? null
    ) as Payment;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return result;
}

export async function updatePayment(
  id: number,
  data: {
    amount?: number;
    due_date?: string;
    paid_date?: string | null;
    status?: string;
    notes?: string;
  }
): Promise<Payment | null> {
  await requireAuth();
  const db = getDb();
  const existing = (db.query("SELECT * FROM payments WHERE id = ?").get(id) as Payment) ?? null;
  if (!existing) return null;

  const result = db
    .query(
      `UPDATE payments SET amount = ?, due_date = ?, paid_date = ?, status = ?, notes = ?
       WHERE id = ? RETURNING *`
    )
    .get(
      data.amount ?? existing.amount,
      data.due_date ?? existing.due_date,
      data.paid_date !== undefined ? data.paid_date : existing.paid_date,
      data.status ?? existing.status,
      data.notes ?? existing.notes,
      id
    ) as Payment;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return result;
}

export async function markPaymentPaid(id: number): Promise<Payment | null> {
  await requireAuth();
  const db = getDb();
  const result = db
    .query(
      `UPDATE payments SET status = 'paid', paid_date = datetime('now')
       WHERE id = ? RETURNING *`
    )
    .get(id) as Payment | undefined;
  if (!result) return null;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return result;
}

// ─── Inquiries ──────────────────────────────────────────────────────────────

export async function submitInquiry(data: {
  room_id: number;
  name: string;
  email: string;
  phone: string;
  employment_status: string;
  income_range: string;
  desired_move_in: string;
  occupants: string;
  has_pets: string;
  background_check_consent: string;
  about?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Public action — no auth required
  const db = getDb();

  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  const phone = data.phone?.trim();
  const about = data.about?.trim() || null;

  // Required fields
  if (!name || !email || !phone) {
    return { success: false, error: "Name, email, and phone are required." };
  }

  // Length limits
  if (name.length > 200 || email.length > 254 || phone.length > 30) {
    return { success: false, error: "One or more fields exceed the maximum length." };
  }
  if (about && about.length > 2000) {
    return { success: false, error: "The 'about' field must be under 2000 characters." };
  }

  // Enum validation
  if (!VALID_EMPLOYMENT.includes(data.employment_status)) {
    return { success: false, error: "Invalid employment status." };
  }
  if (!VALID_INCOME.includes(data.income_range)) {
    return { success: false, error: "Invalid income range." };
  }
  if (!["1", "2"].includes(data.occupants)) {
    return { success: false, error: "Invalid occupants value." };
  }
  if (!["yes", "no"].includes(data.has_pets) || !["yes", "no"].includes(data.background_check_consent)) {
    return { success: false, error: "Invalid selection." };
  }

  try {
    db.query(
      `INSERT INTO inquiries (room_id, name, email, phone, employment_status, income_range, desired_move_in, occupants, has_pets, background_check_consent, about)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.room_id,
      name,
      email,
      phone,
      data.employment_status,
      data.income_range,
      data.desired_move_in,
      data.occupants,
      data.has_pets,
      data.background_check_consent,
      about
    );

    // Send email notification (fire-and-forget — don't block the response)
    const roomInfo = db.query(
      `SELECT r.room_number, p.name AS property_name
       FROM rooms r JOIN properties p ON r.property_id = p.id
       WHERE r.id = ?`
    ).get(data.room_id) as { room_number: string; property_name: string } | null;

    sendInquiryEmail({
      name,
      email,
      phone,
      employment_status: data.employment_status,
      income_range: data.income_range,
      desired_move_in: data.desired_move_in,
      occupants: data.occupants,
      has_pets: data.has_pets,
      background_check_consent: data.background_check_consent,
      about,
      room_number: roomInfo?.room_number ?? "Unknown",
      property_name: roomInfo?.property_name ?? "Unknown",
    }).catch(() => {}); // Silently swallow — DB insert already succeeded

    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function getInquiries(): Promise<(Inquiry & { room_number: string; property_name: string })[]> {
  await requireAuth();
  const db = getDb();
  return db
    .query(
      `SELECT i.*, r.room_number, p.name AS property_name
       FROM inquiries i
       JOIN rooms r ON i.room_id = r.id
       JOIN properties p ON r.property_id = p.id
       ORDER BY i.created_at DESC
       LIMIT 200`
    )
    .all() as (Inquiry & { room_number: string; property_name: string })[];
}

export async function getInquiry(id: number): Promise<(Inquiry & { room_number: string; property_name: string; room_price: number; property_city: string }) | null> {
  await requireAuth();
  const db = getDb();
  return (db
    .query(
      `SELECT i.*, r.room_number, r.price AS room_price, p.name AS property_name, p.city AS property_city
       FROM inquiries i
       JOIN rooms r ON i.room_id = r.id
       JOIN properties p ON r.property_id = p.id
       WHERE i.id = ?`
    )
    .get(id) as (Inquiry & { room_number: string; property_name: string; room_price: number; property_city: string })) ?? null;
}

export async function updateInquiryStatus(id: number, status: string): Promise<void> {
  await requireAuth();
  if (!(INQUIRY_STATUSES as readonly string[]).includes(status)) return;
  const db = getDb();
  db.query("UPDATE inquiries SET status = ? WHERE id = ?").run(status, id);
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

// ─── Bulk Operations ────────────────────────────────────────────────────────

export async function createBulkPayments(
  entries: { tenant_id: number; amount: number; due_date: string; status: "paid" | "upcoming"; paid_date: string | null }[]
): Promise<void> {
  await requireAuth();
  const db = getDb();
  const checkDup = db.prepare(
    "SELECT id FROM payments WHERE tenant_id = ? AND due_date = ? LIMIT 1"
  );
  const stmt = db.prepare(
    "INSERT INTO payments (tenant_id, amount, due_date, status, paid_date) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const e of entries) {
      if (e.amount <= 0) continue;
      const existing = checkDup.get(e.tenant_id, e.due_date);
      if (existing) continue;
      stmt.run(e.tenant_id, e.amount, e.due_date, e.status, e.paid_date);
    }
  });
  tx();
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

export async function createBulkExpenses(
  entries: { property_id: number; category: string; amount: number; month: string; notes: string | null }[]
): Promise<void> {
  await requireAuth();
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO expenses (property_id, category, amount, month, notes) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const e of entries) {
      if (!VALID_EXPENSE_CATEGORIES.includes(e.category)) continue;
      if (!/^\d{4}-\d{2}$/.test(e.month)) continue;
      stmt.run(e.property_id, e.category, e.amount, e.month, e.notes);
    }
  });
  tx();
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function getExpenses(propertyId?: number, month?: string, endMonth?: string): Promise<(Expense & { property_name: string })[]> {
  await requireAuth();
  const db = getDb();
  let sql = `SELECT e.*, p.name AS property_name FROM expenses e JOIN properties p ON e.property_id = p.id`;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (propertyId) {
    conditions.push("e.property_id = ?");
    params.push(propertyId);
  }
  if (month && endMonth && month !== endMonth) {
    conditions.push("e.month >= ? AND e.month <= ?");
    params.push(month, endMonth);
  } else if (month) {
    conditions.push("e.month = ?");
    params.push(month);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY e.month DESC, p.name, e.category LIMIT 500";

  return db.query(sql).all(...params) as (Expense & { property_name: string })[];
}

export async function getExpense(id: number): Promise<Expense | null> {
  await requireAuth();
  const db = getDb();
  return (db.query("SELECT * FROM expenses WHERE id = ?").get(id) as Expense) ?? null;
}

export async function createExpense(data: {
  property_id: number;
  category: string;
  amount: number;
  month: string;
  notes?: string;
}): Promise<Expense> {
  await requireAuth();
  const db = getDb();

  if (!VALID_EXPENSE_CATEGORIES.includes(data.category)) {
    throw new Error("Invalid expense category.");
  }
  if (!/^\d{4}-\d{2}$/.test(data.month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  const result = db
    .query(
      `INSERT INTO expenses (property_id, category, amount, month, notes)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    )
    .get(data.property_id, data.category, data.amount, data.month, data.notes ?? null) as Expense;
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return result;
}

export async function updateExpense(
  id: number,
  data: { category?: string; amount?: number; month?: string; notes?: string | null }
): Promise<Expense | null> {
  await requireAuth();
  const db = getDb();
  const existing = (db.query("SELECT * FROM expenses WHERE id = ?").get(id) as Expense) ?? null;
  if (!existing) return null;

  if (data.category && !VALID_EXPENSE_CATEGORIES.includes(data.category)) {
    throw new Error("Invalid expense category.");
  }
  if (data.month && !/^\d{4}-\d{2}$/.test(data.month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  const result = db
    .query(
      `UPDATE expenses SET category = ?, amount = ?, month = ?, notes = ?
       WHERE id = ? RETURNING *`
    )
    .get(
      data.category ?? existing.category,
      data.amount ?? existing.amount,
      data.month ?? existing.month,
      data.notes !== undefined ? (data.notes ?? null) : existing.notes,
      id
    ) as Expense;
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return result;
}

export async function deleteExpense(id: number): Promise<void> {
  await requireAuth();
  const db = getDb();
  db.query("DELETE FROM expenses WHERE id = ?").run(id);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

// ─── Lock Codes ──────────────────────────────────────────────────────────────

export async function getLockCodes(roomId: number): Promise<(LockCode & { tenant_name: string | null })[]> {
  await requireAuth();
  const db = getDb();
  return db
    .query(
      `SELECT lc.*, t.name AS tenant_name
       FROM lock_codes lc
       LEFT JOIN tenants t ON lc.tenant_id = t.id
       WHERE lc.room_id = ?
       ORDER BY lc.created_at`
    )
    .all(roomId) as (LockCode & { tenant_name: string | null })[];
}

export async function getAllLockCodesGrouped(propertyId?: number): Promise<
  (LockCode & { tenant_name: string | null; room_number: string; property_name: string; property_id: number })[]
> {
  await requireAuth();
  const db = getDb();
  let sql = `
    SELECT lc.*, t.name AS tenant_name, r.room_number, p.name AS property_name, r.property_id
    FROM lock_codes lc
    JOIN rooms r ON lc.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    LEFT JOIN tenants t ON lc.tenant_id = t.id
  `;
  const params: number[] = [];
  if (propertyId) {
    sql += " WHERE r.property_id = ?";
    params.push(propertyId);
  }
  sql += " ORDER BY p.name, r.room_number, lc.created_at";
  return db.query(sql).all(...params) as (LockCode & {
    tenant_name: string | null;
    room_number: string;
    property_name: string;
    property_id: number;
  })[];
}

export async function createLockCode(data: {
  room_id: number;
  code: string;
  label: string;
  tenant_id?: number | null;
}): Promise<LockCode> {
  await requireAuth();
  const db = getDb();
  const result = db
    .query(
      `INSERT INTO lock_codes (room_id, code, label, tenant_id)
       VALUES (?, ?, ?, ?) RETURNING *`
    )
    .get(data.room_id, data.code, data.label, data.tenant_id ?? null) as LockCode;
  revalidatePath("/admin/lock-codes");
  return result;
}

export async function updateLockCode(
  id: number,
  data: { code?: string; label?: string; tenant_id?: number | null }
): Promise<LockCode | null> {
  await requireAuth();
  const db = getDb();
  const existing = (db.query("SELECT * FROM lock_codes WHERE id = ?").get(id) as LockCode) ?? null;
  if (!existing) return null;

  const result = db
    .query(
      `UPDATE lock_codes SET code = ?, label = ?, tenant_id = ?
       WHERE id = ? RETURNING *`
    )
    .get(
      data.code ?? existing.code,
      data.label ?? existing.label,
      data.tenant_id !== undefined ? data.tenant_id : existing.tenant_id,
      id
    ) as LockCode;
  revalidatePath("/admin/lock-codes");
  return result;
}

export async function deleteLockCode(id: number): Promise<void> {
  await requireAuth();
  const db = getDb();
  db.query("DELETE FROM lock_codes WHERE id = ?").run(id);
  revalidatePath("/admin/lock-codes");
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(propertyId?: number): Promise<DashboardStats> {
  await requireAuth();
  const db = getDb();

  const propFilter = propertyId != null;

  const totalProperties = propFilter ? 1 : (
    db.query("SELECT COUNT(*) as count FROM properties").get() as { count: number }
  ).count;

  const totalRooms = (
    db.query(
      propFilter
        ? "SELECT COUNT(*) as count FROM rooms WHERE property_id = ?"
        : "SELECT COUNT(*) as count FROM rooms"
    ).get(...(propFilter ? [propertyId] : [])) as { count: number }
  ).count;

  const totalTenants = (
    db.query(
      propFilter
        ? "SELECT COUNT(*) as count FROM tenants t JOIN rooms r ON t.room_id = r.id WHERE t.status = 'active' AND r.property_id = ?"
        : "SELECT COUNT(*) as count FROM tenants WHERE status = 'active'"
    ).get(...(propFilter ? [propertyId] : [])) as { count: number }
  ).count;

  const occupiedRooms = (
    db.query(
      propFilter
        ? "SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied' AND property_id = ?"
        : "SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'"
    ).get(...(propFilter ? [propertyId] : [])) as { count: number }
  ).count;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const currentMonth = getCurrentMonth();

  const rentCollected = (
    db.query(
      propFilter
        ? "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN tenants t ON p.tenant_id = t.id JOIN rooms r ON t.room_id = r.id WHERE p.status = 'paid' AND strftime('%Y-%m', p.due_date) = ? AND r.property_id = ?"
        : "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND strftime('%Y-%m', due_date) = ?"
    ).get(...(propFilter ? [currentMonth, propertyId] : [currentMonth])) as { total: number }
  ).total;

  const rentOutstanding = (
    db.query(
      propFilter
        ? "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN tenants t ON p.tenant_id = t.id JOIN rooms r ON t.room_id = r.id WHERE p.status IN ('upcoming', 'overdue') AND strftime('%Y-%m', p.due_date) = ? AND r.property_id = ?"
        : "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status IN ('upcoming', 'overdue') AND strftime('%Y-%m', due_date) = ?"
    ).get(...(propFilter ? [currentMonth, propertyId] : [currentMonth])) as { total: number }
  ).total;

  const totalExpenses = (
    db.query(
      propFilter
        ? "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month = ? AND property_id = ?"
        : "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month = ?"
    ).get(...(propFilter ? [currentMonth, propertyId] : [currentMonth])) as { total: number }
  ).total;

  const netIncome = rentCollected - totalExpenses;

  return {
    totalProperties,
    totalRooms,
    totalTenants,
    occupancyRate,
    rentCollected,
    rentOutstanding,
    totalExpenses,
    netIncome,
  };
}
