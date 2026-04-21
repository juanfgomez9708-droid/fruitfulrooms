"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "./supabase";
import { requireAuth } from "./auth";
import { VALID_EXPENSE_CATEGORIES } from "./constants";
import type { Property, Room, Tenant, ConfirmedTransaction, ImportResult } from "./types";

// ─── Data Fetching for Import Page ────────────────────────────────────────────

export async function getImportData(): Promise<{
  properties: Property[];
  tenants: (Tenant & { room_id: number | null })[];
  rooms: (Room & { property_id: number })[];
}> {
  await requireAuth();

  const [{ data: properties }, { data: tenants }, { data: rooms }] = await Promise.all([
    supabaseAdmin.from("properties").select("*").order("name"),
    supabaseAdmin.from("tenants").select("*").eq("status", "active"),
    supabaseAdmin.from("rooms").select("*"),
  ]);

  return {
    properties: (properties ?? []) as Property[],
    tenants: (tenants ?? []) as (Tenant & { room_id: number | null })[],
    rooms: (rooms ?? []) as (Room & { property_id: number })[],
  };
}

// ─── Import Transactions ──────────────────────────────────────────────────────

export async function importTransactions(
  transactions: ConfirmedTransaction[],
): Promise<ImportResult> {
  await requireAuth();

  const result: ImportResult = {
    expensesCreated: 0,
    paymentsCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  // Separate into expenses and payments
  const expenses = transactions.filter((t) => t.type === "expense");
  const payments = transactions.filter((t) => t.type === "payment");

  // ── Insert Expenses ──
  if (expenses.length > 0) {
    const validExpenses = expenses.filter((e) => {
      if (!e.property_id) {
        result.errors.push(`Expense skipped: no property assigned (${e.notes || "$" + e.amount})`);
        return false;
      }
      if (!e.category || !VALID_EXPENSE_CATEGORIES.includes(e.category)) {
        result.errors.push(`Expense skipped: invalid category "${e.category}" (${e.notes || "$" + e.amount})`);
        return false;
      }
      if (!e.month || !/^\d{4}-\d{2}$/.test(e.month)) {
        result.errors.push(`Expense skipped: invalid month "${e.month}"`);
        return false;
      }
      return true;
    });

    if (validExpenses.length > 0) {
      const { error } = await supabaseAdmin.from("expenses").insert(
        validExpenses.map((e) => ({
          property_id: e.property_id!,
          category: e.category!,
          amount: e.amount,
          month: e.month!,
          notes: e.notes ?? null,
        }))
      );
      if (error) {
        result.errors.push(`Expense insert error: ${error.message}`);
      } else {
        result.expensesCreated = validExpenses.length;
      }
    }
  }

  // ── Insert Payments ──
  if (payments.length > 0) {
    const validPayments = payments.filter((p) => {
      if (!p.tenant_id) {
        result.errors.push(`Payment skipped: no tenant assigned ($${p.amount})`);
        return false;
      }
      if (!p.due_date) {
        result.errors.push(`Payment skipped: no due date ($${p.amount})`);
        return false;
      }
      return true;
    });

    if (validPayments.length > 0) {
      // Check for existing payments with same tenant + due_date to prevent duplicates
      const tenantIds = [...new Set(validPayments.map((p) => p.tenant_id!))];
      const dueDates = [...new Set(validPayments.map((p) => p.due_date!))];
      const { data: existing } = await supabaseAdmin
        .from("payments")
        .select("tenant_id, due_date")
        .in("tenant_id", tenantIds)
        .in("due_date", dueDates);

      const existingKeys = new Set(
        (existing ?? []).map((p: Record<string, unknown>) => `${p.tenant_id}|${p.due_date}`)
      );

      const newPayments = validPayments.filter((p) => {
        const key = `${p.tenant_id}|${p.due_date}`;
        if (existingKeys.has(key)) {
          result.duplicatesSkipped++;
          return false;
        }
        return true;
      });

      if (newPayments.length > 0) {
        const { error } = await supabaseAdmin.from("payments").insert(
          newPayments.map((p) => ({
            tenant_id: p.tenant_id!,
            amount: p.amount,
            due_date: p.due_date!,
            paid_date: p.paid_date ?? null,
            status: p.paid_date ? "paid" : "upcoming",
            notes: p.notes ?? null,
          }))
        );
        if (error) {
          result.errors.push(`Payment insert error: ${error.message}`);
        } else {
          result.paymentsCreated = newPayments.length;
        }
      }
    }
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");

  return result;
}
