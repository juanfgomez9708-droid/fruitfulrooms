import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
if (!supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");

/** Public client — respects RLS. Use for public listings and inquiry submission. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Admin client — bypasses RLS. Use for all admin CRUD operations. */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
