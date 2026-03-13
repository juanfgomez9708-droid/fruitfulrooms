"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "./db";
import { requireAuth } from "./auth";
import type { Property, Room, Tenant, Payment, DashboardStats } from "./types";

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

// ─── Tenants ─────────────────────────────────────────────────────────────────

export async function getTenants(): Promise<Tenant[]> {
  await requireAuth();
  const db = getDb();
  return db.query("SELECT * FROM tenants ORDER BY created_at DESC").all() as Tenant[];
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

export async function getPayments(tenantId?: number): Promise<Payment[]> {
  await requireAuth();
  const db = getDb();
  if (tenantId) {
    return db
      .query("SELECT * FROM payments WHERE tenant_id = ? ORDER BY due_date DESC")
      .all(tenantId) as Payment[];
  }
  return db.query("SELECT * FROM payments ORDER BY due_date DESC").all() as Payment[];
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

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth();
  const db = getDb();

  const totalProperties = (
    db.query("SELECT COUNT(*) as count FROM properties").get() as { count: number }
  ).count;

  const totalRooms = (
    db.query("SELECT COUNT(*) as count FROM rooms").get() as { count: number }
  ).count;

  const totalTenants = (
    db.query("SELECT COUNT(*) as count FROM tenants WHERE status = 'active'").get() as {
      count: number;
    }
  ).count;

  const occupiedRooms = (
    db.query("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get() as {
      count: number;
    }
  ).count;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const rentCollected = (
    db.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'").get() as {
      total: number;
    }
  ).total;

  const rentOutstanding = (
    db
      .query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status IN ('upcoming', 'overdue')"
      )
      .get() as { total: number }
  ).total;

  return {
    totalProperties,
    totalRooms,
    totalTenants,
    occupancyRate,
    rentCollected,
    rentOutstanding,
  };
}
