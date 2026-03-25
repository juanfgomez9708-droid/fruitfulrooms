import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing ${name} environment variable`);
  return val;
}

/** Public client — respects RLS. Use for public listings and inquiry submission. */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  }
  return _supabase;
}

/** Admin client — bypasses RLS. Use for all admin CRUD operations. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
  }
  return _supabaseAdmin;
}

// Re-export as constants via getters for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string) {
    const client = getSupabase();
    const value = (client as unknown as Record<string, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop: string) {
    const client = getSupabaseAdmin();
    const value = (client as unknown as Record<string, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
