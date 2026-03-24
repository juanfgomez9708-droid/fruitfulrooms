"use server";

import { revalidatePath } from "next/cache";
import { supabase, supabaseAdmin } from "./supabase";
import { requireAuth } from "./auth";
import { VALID_EMPLOYMENT, VALID_INCOME, INQUIRY_STATUSES, VALID_EXPENSE_CATEGORIES } from "./constants";
import { getCurrentMonth } from "./utils";
import type { Property, Room, Tenant, Payment, Inquiry, Expense, LockCode, DashboardStats } from "./types";
import { sendInquiryEmail } from "./email";

/** Returns the first day of the month after the given YYYY-MM string. */
function nextMonthStart(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

// ─── Properties ──────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Property[];
}

export async function getProperty(id: number): Promise<Property | null> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Property | null;
}

export async function createProperty(data: {
  name: string;
  address: string;
  city: string;
  description?: string;
  photo_url?: string;
}): Promise<Property> {
  await requireAuth();
  const { data: result, error } = await supabaseAdmin
    .from("properties")
    .insert({
      name: data.name,
      address: data.address,
      city: data.city,
      description: data.description ?? null,
      photo_url: data.photo_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/properties");
  revalidatePath("/admin");
  return result as Property;
}

export async function updateProperty(
  id: number,
  data: { name?: string; address?: string; city?: string; description?: string; photo_url?: string }
): Promise<Property | null> {
  await requireAuth();
  const existing = await getProperty(id);
  if (!existing) return null;

  const { data: result, error } = await supabaseAdmin
    .from("properties")
    .update({
      name: data.name ?? existing.name,
      address: data.address ?? existing.address,
      city: data.city ?? existing.city,
      description: data.description ?? existing.description,
      photo_url: data.photo_url ?? existing.photo_url,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  revalidatePath("/admin");
  return result as Property;
}

export async function deleteProperty(id: number): Promise<void> {
  await requireAuth();
  const { error } = await supabaseAdmin.from("properties").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/properties");
  revalidatePath("/admin");
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function getRooms(propertyId: number): Promise<Room[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("property_id", propertyId)
    .order("room_number");
  if (error) throw error;
  return data as Room[];
}

export async function getAllRooms(): Promise<(Room & { property_name: string })[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*, properties(name)")
    .order("room_number");
  if (error) throw error;
  // Flatten: PostgREST returns { ...room, properties: { name } }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { properties: prop, ...room } = row;
    return {
      ...room,
      property_name: (prop as { name: string })?.name ?? "",
    };
  }) as (Room & { property_name: string })[];
}

export async function getRoom(id: number): Promise<Room | null> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Room | null;
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
  // Parse amenities if passed as JSON string (from forms)
  let amenities: string[] | null = null;
  if (data.amenities) {
    try {
      amenities = JSON.parse(data.amenities);
    } catch {
      amenities = null;
    }
  }

  const { data: result, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      property_id: data.property_id,
      room_number: data.room_number,
      price: data.price,
      status: data.status ?? "vacant",
      amenities,
      photo_url: data.photo_url ?? null,
      description: data.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/admin/properties/${data.property_id}`);
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/listings");
  return result as Room;
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
  const existing = await getRoom(id);
  if (!existing) return null;

  // Parse amenities if passed as JSON string
  let amenities: string[] | null = existing.amenities;
  if (data.amenities !== undefined) {
    try {
      amenities = data.amenities ? JSON.parse(data.amenities) : null;
    } catch {
      amenities = existing.amenities;
    }
  }

  const { data: result, error } = await supabaseAdmin
    .from("rooms")
    .update({
      room_number: data.room_number ?? existing.room_number,
      price: data.price ?? existing.price,
      status: data.status ?? existing.status,
      amenities,
      photo_url: data.photo_url ?? existing.photo_url,
      description: data.description ?? existing.description,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/admin/properties/${existing.property_id}`);
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/listings");
  return result as Room;
}

export async function deleteRoom(id: number): Promise<void> {
  await requireAuth();
  const room = await getRoom(id);
  const { error } = await supabaseAdmin.from("rooms").delete().eq("id", id);
  if (error) throw error;
  if (room) {
    revalidatePath(`/admin/properties/${room.property_id}`);
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/listings");
}

export async function getVacantRooms(): Promise<(Room & { property_name: string; property_city: string })[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*, properties(name, city)")
    .eq("status", "vacant")
    .order("price", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { properties: prop, ...room } = row;
    const p = prop as { name: string; city: string } | null;
    return {
      ...room,
      property_name: p?.name ?? "",
      property_city: p?.city ?? "",
    };
  }) as (Room & { property_name: string; property_city: string })[];
}

// ─── Public Read-Only (no auth required) ────────────────────────────────────

export async function getPublicRoom(id: number): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

export async function getPublicProperty(id: number): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Property | null;
}

export async function getPublicProperties(): Promise<(Property & { vacant_count: number; min_price: number })[]> {
  const { data, error } = await supabase
    .from("public_properties_with_vacancies")
    .select("*");
  if (error) throw error;
  return (data ?? []) as (Property & { vacant_count: number; min_price: number })[];
}

export async function getPropertyVacantRooms(propertyId: number): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("property_id", propertyId)
    .eq("status", "vacant")
    .order("price", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Room[];
}

// ─── Tenants ─────────────────────────────────────────────────────────────────

export async function getTenants(): Promise<Tenant[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Tenant[];
}

export async function getTenantsWithRooms(propertyId?: number): Promise<
  (Tenant & { room_number: string; room_price: number; property_id: number; property_name: string })[]
> {
  await requireAuth();
  let query = supabaseAdmin
    .from("tenants")
    .select("*, rooms(room_number, price, property_id, properties(name))")
    .eq("status", "active")
    .not("room_id", "is", null);

  if (propertyId) {
    query = query.eq("rooms.property_id", propertyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Flatten nested structure
  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const { rooms: roomData, ...tenant } = row;
      const r = roomData as { room_number: string; price: number; property_id: number; properties: { name: string } } | null;
      if (!r) return null;
      return {
        ...tenant,
        room_number: r.room_number,
        room_price: r.price,
        property_id: r.property_id,
        property_name: r.properties?.name ?? "",
      };
    })
    .filter(Boolean) as (Tenant & { room_number: string; room_price: number; property_id: number; property_name: string })[];
}

export async function getTenant(id: number): Promise<Tenant | null> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Tenant | null;
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
  const { data: result, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      room_id: data.room_id ?? null,
      move_in_date: data.move_in_date ?? null,
      status: data.status ?? "active",
    })
    .select()
    .single();
  if (error) throw error;

  // Mark room as occupied if assigned
  if (data.room_id) {
    await supabaseAdmin
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", data.room_id);
    revalidatePath("/listings");
  }

  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
  return result as Tenant;
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
  const existing = await getTenant(id);
  if (!existing) return null;

  // If room assignment changed, update room statuses
  const newRoomId = data.room_id !== undefined ? data.room_id : existing.room_id;
  if (existing.room_id !== newRoomId) {
    // Free old room
    if (existing.room_id) {
      await supabaseAdmin
        .from("rooms")
        .update({ status: "vacant" })
        .eq("id", existing.room_id);
    }
    // Occupy new room
    if (newRoomId) {
      await supabaseAdmin
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", newRoomId);
    }
    revalidatePath("/listings");
  }

  const { data: result, error } = await supabaseAdmin
    .from("tenants")
    .update({
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
      phone: data.phone ?? existing.phone,
      room_id: newRoomId,
      move_in_date: data.move_in_date ?? existing.move_in_date,
      status: data.status ?? existing.status,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${id}`);
  revalidatePath("/admin");
  return result as Tenant;
}

export async function deleteTenant(id: number): Promise<void> {
  await requireAuth();
  const tenant = await getTenant(id);

  // Free the room if tenant was assigned
  if (tenant?.room_id) {
    await supabaseAdmin
      .from("rooms")
      .update({ status: "vacant" })
      .eq("id", tenant.room_id);
    revalidatePath("/listings");
  }

  const { error } = await supabaseAdmin.from("tenants").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function getPayments(tenantId?: number, propertyId?: number, startMonth?: string, endMonth?: string): Promise<Payment[]> {
  await requireAuth();

  if (propertyId) {
    // Need to filter payments through tenants→rooms→property
    // Use a manual approach: get tenant IDs for the property, then filter payments
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, rooms!inner(property_id)")
      .eq("rooms.property_id", propertyId);

    const tenantIds = (tenants ?? []).map((t: Record<string, unknown>) => (t as { id: number }).id);
    if (tenantIds.length === 0) return [];

    let query = supabaseAdmin
      .from("payments")
      .select("*")
      .in("tenant_id", tenantIds);

    if (startMonth && endMonth && startMonth !== endMonth) {
      query = query.gte("due_date", `${startMonth}-01`).lt("due_date", nextMonthStart(endMonth));
    } else if (startMonth) {
      query = query.gte("due_date", `${startMonth}-01`).lt("due_date", nextMonthStart(startMonth));
    }

    const { data, error } = await query.order("due_date", { ascending: false });
    if (error) throw error;
    return data as Payment[];
  }

  let query = supabaseAdmin.from("payments").select("*");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  if (startMonth && endMonth && startMonth !== endMonth) {
    query = query.gte("due_date", `${startMonth}-01`).lt("due_date", nextMonthStart(endMonth));
  } else if (startMonth) {
    query = query.gte("due_date", `${startMonth}-01`).lt("due_date", nextMonthStart(startMonth));
  }

  const { data, error } = await query.order("due_date", { ascending: false });
  if (error) throw error;
  return data as Payment[];
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
  const { data: result, error } = await supabaseAdmin
    .from("payments")
    .insert({
      tenant_id: data.tenant_id,
      amount: data.amount,
      due_date: data.due_date,
      paid_date: data.paid_date ?? null,
      status: data.status ?? "upcoming",
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return result as Payment;
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
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) return null;

  const ex = existing as Payment;
  const { data: result, error } = await supabaseAdmin
    .from("payments")
    .update({
      amount: data.amount ?? ex.amount,
      due_date: data.due_date ?? ex.due_date,
      paid_date: data.paid_date !== undefined ? data.paid_date : ex.paid_date,
      status: data.status ?? ex.status,
      notes: data.notes ?? ex.notes,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return result as Payment;
}

export async function markPaymentPaid(id: number): Promise<Payment | null> {
  await requireAuth();
  const { data: result, error } = await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      paid_date: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (!result) return null;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return result as Payment;
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
  // Public action — no auth required, uses anon client
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
    const { error } = await supabase.from("inquiries").insert({
      room_id: data.room_id,
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
    });
    if (error) throw error;

    // Send email notification (fire-and-forget — don't block the response)
    const { data: roomInfo } = await supabase
      .from("rooms")
      .select("room_number, properties(name)")
      .eq("id", data.room_id)
      .single();
    const propName = ((roomInfo as Record<string, unknown>)?.properties as { name: string } | null)?.name ?? "Unknown";

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
      property_name: propName,
    }).catch(() => {}); // Silently swallow — DB insert already succeeded

    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function getInquiries(): Promise<(Inquiry & { room_number: string; property_name: string })[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("inquiries")
    .select("*, rooms(room_number, properties(name))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { rooms: roomData, ...inquiry } = row;
    const r = roomData as { room_number: string; properties: { name: string } } | null;
    return {
      ...inquiry,
      room_number: r?.room_number ?? "",
      property_name: r?.properties?.name ?? "",
    };
  }) as (Inquiry & { room_number: string; property_name: string })[];
}

export async function getInquiry(id: number): Promise<(Inquiry & { room_number: string; property_name: string; room_price: number; property_city: string }) | null> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("inquiries")
    .select("*, rooms(room_number, price, properties(name, city))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { rooms: roomData, ...inquiry } = data as Record<string, unknown>;
  const r = roomData as { room_number: string; price: number; properties: { name: string; city: string } } | null;
  return {
    ...inquiry,
    room_number: r?.room_number ?? "",
    room_price: r?.price ?? 0,
    property_name: r?.properties?.name ?? "",
    property_city: r?.properties?.city ?? "",
  } as Inquiry & { room_number: string; property_name: string; room_price: number; property_city: string };
}

export async function updateInquiryStatus(id: number, status: string): Promise<void> {
  await requireAuth();
  if (!(INQUIRY_STATUSES as readonly string[]).includes(status)) return;
  const { error } = await supabaseAdmin
    .from("inquiries")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

// ─── Bulk Operations ────────────────────────────────────────────────────────

export async function createBulkPayments(
  entries: { tenant_id: number; amount: number; due_date: string; status: "paid" | "upcoming"; paid_date: string | null }[]
): Promise<void> {
  await requireAuth();

  // Filter out invalid entries
  const candidates = entries.filter((e) => e.amount > 0);
  if (candidates.length === 0) return;

  // Batch duplicate check: fetch all existing (tenant_id, due_date) pairs in one query
  const tenantIds = [...new Set(candidates.map((e) => e.tenant_id))];
  const dueDates = [...new Set(candidates.map((e) => e.due_date))];
  const { data: existingPayments } = await supabaseAdmin
    .from("payments")
    .select("tenant_id, due_date")
    .in("tenant_id", tenantIds)
    .in("due_date", dueDates);

  const existingKeys = new Set(
    (existingPayments ?? []).map((p: Record<string, unknown>) => `${p.tenant_id}|${p.due_date}`)
  );
  const validEntries = candidates.filter((e) => !existingKeys.has(`${e.tenant_id}|${e.due_date}`));

  if (validEntries.length === 0) return;

  // Insert all valid entries as a batch
  const { error } = await supabaseAdmin.from("payments").insert(
    validEntries.map((e) => ({
      tenant_id: e.tenant_id,
      amount: e.amount,
      due_date: e.due_date,
      status: e.status,
      paid_date: e.paid_date,
    }))
  );
  if (error) throw error;
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

export async function createBulkExpenses(
  entries: { property_id: number; category: string; amount: number; month: string; notes: string | null }[]
): Promise<void> {
  await requireAuth();

  const validEntries = entries.filter((e) => {
    if (!VALID_EXPENSE_CATEGORIES.includes(e.category)) return false;
    if (!/^\d{4}-\d{2}$/.test(e.month)) return false;
    return true;
  });

  if (validEntries.length === 0) return;

  const { error } = await supabaseAdmin.from("expenses").insert(
    validEntries.map((e) => ({
      property_id: e.property_id,
      category: e.category,
      amount: e.amount,
      month: e.month,
      notes: e.notes,
    }))
  );
  if (error) throw error;
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function getExpenses(propertyId?: number, month?: string, endMonth?: string): Promise<(Expense & { property_name: string })[]> {
  await requireAuth();
  let query = supabaseAdmin
    .from("expenses")
    .select("*, properties(name)");

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }
  if (month && endMonth && month !== endMonth) {
    query = query.gte("month", month).lte("month", endMonth);
  } else if (month) {
    query = query.eq("month", month);
  }

  const { data, error } = await query
    .order("month", { ascending: false })
    .limit(500);
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const { properties: prop, ...expense } = row;
    return {
      ...expense,
      property_name: (prop as { name: string })?.name ?? "",
    };
  }) as (Expense & { property_name: string })[];
}

export async function getExpense(id: number): Promise<Expense | null> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Expense | null;
}

export async function createExpense(data: {
  property_id: number;
  category: string;
  amount: number;
  month: string;
  notes?: string;
}): Promise<Expense> {
  await requireAuth();

  if (!VALID_EXPENSE_CATEGORIES.includes(data.category)) {
    throw new Error("Invalid expense category.");
  }
  if (!/^\d{4}-\d{2}$/.test(data.month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  const { data: result, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      property_id: data.property_id,
      category: data.category,
      amount: data.amount,
      month: data.month,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return result as Expense;
}

export async function updateExpense(
  id: number,
  data: { category?: string; amount?: number; month?: string; notes?: string | null }
): Promise<Expense | null> {
  await requireAuth();
  const ex = await getExpense(id);
  if (!ex) return null;

  if (data.category && !VALID_EXPENSE_CATEGORIES.includes(data.category)) {
    throw new Error("Invalid expense category.");
  }
  if (data.month && !/^\d{4}-\d{2}$/.test(data.month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  const { data: result, error } = await supabaseAdmin
    .from("expenses")
    .update({
      category: data.category ?? ex.category,
      amount: data.amount ?? ex.amount,
      month: data.month ?? ex.month,
      notes: data.notes !== undefined ? (data.notes ?? null) : ex.notes,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return result as Expense;
}

export async function deleteExpense(id: number): Promise<void> {
  await requireAuth();
  const { error } = await supabaseAdmin.from("expenses").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

// ─── Lock Codes ──────────────────────────────────────────────────────────────

export async function getLockCodes(roomId: number): Promise<(LockCode & { tenant_name: string | null })[]> {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("lock_codes")
    .select("*, tenants(name)")
    .eq("room_id", roomId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { tenants: tenantData, ...lc } = row;
    return { ...lc, tenant_name: (tenantData as { name: string } | null)?.name ?? null };
  }) as (LockCode & { tenant_name: string | null })[];
}

export async function getAllLockCodesGrouped(propertyId?: number): Promise<
  (LockCode & { tenant_name: string | null; room_number: string; property_name: string; property_id: number })[]
> {
  await requireAuth();
  let query = supabaseAdmin
    .from("lock_codes")
    .select("*, tenants(name), rooms(room_number, property_id, properties(name))");
  if (propertyId) {
    query = query.eq("rooms.property_id", propertyId);
  }
  const { data, error } = await query.order("created_at");
  if (error) throw error;
  return (data ?? [])
    .filter((row: Record<string, unknown>) => {
      if (!propertyId) return true;
      const r = row.rooms as { property_id: number } | null;
      return r?.property_id === propertyId;
    })
    .map((row: Record<string, unknown>) => {
      const { tenants: tenantData, rooms: roomData, ...lc } = row;
      const r = roomData as { room_number: string; property_id: number; properties: { name: string } } | null;
      return {
        ...lc,
        tenant_name: (tenantData as { name: string } | null)?.name ?? null,
        room_number: r?.room_number ?? "",
        property_name: r?.properties?.name ?? "",
        property_id: r?.property_id ?? 0,
      };
    }) as (LockCode & { tenant_name: string | null; room_number: string; property_name: string; property_id: number })[];
}

export async function createLockCode(data: {
  room_id: number;
  code: string;
  label: string;
  tenant_id?: number | null;
}): Promise<LockCode> {
  await requireAuth();
  const { data: result, error } = await supabaseAdmin
    .from("lock_codes")
    .insert({ room_id: data.room_id, code: data.code, label: data.label, tenant_id: data.tenant_id ?? null })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/lock-codes");
  return result as LockCode;
}

export async function updateLockCode(
  id: number,
  data: { code?: string; label?: string; tenant_id?: number | null }
): Promise<LockCode | null> {
  await requireAuth();
  const updates: Record<string, unknown> = {};
  if (data.code !== undefined) updates.code = data.code;
  if (data.label !== undefined) updates.label = data.label;
  if (data.tenant_id !== undefined) updates.tenant_id = data.tenant_id;

  const { data: result, error } = await supabaseAdmin
    .from("lock_codes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  revalidatePath("/admin/lock-codes");
  return result as LockCode;
}

export async function deleteLockCode(id: number): Promise<void> {
  await requireAuth();
  await supabaseAdmin.from("lock_codes").delete().eq("id", id);
  revalidatePath("/admin/lock-codes");
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(propertyId?: number): Promise<DashboardStats> {
  await requireAuth();
  const currentMonth = getCurrentMonth();

  const { data, error } = await supabaseAdmin.rpc("get_dashboard_stats", {
    p_property_id: propertyId ?? null,
    p_current_month: currentMonth,
  });
  if (error) throw error;

  const stats = data as Record<string, number>;
  return {
    totalProperties: stats.totalProperties ?? 0,
    totalRooms: stats.totalRooms ?? 0,
    totalTenants: stats.totalTenants ?? 0,
    occupancyRate: stats.occupancyRate ?? 0,
    rentCollected: stats.rentCollected ?? 0,
    rentOutstanding: stats.rentOutstanding ?? 0,
    totalExpenses: stats.totalExpenses ?? 0,
    netIncome: stats.netIncome ?? 0,
  };
}
