export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  description: string | null;
  photo_url: string | null;
  rental_type: "co-living" | "whole-house";
  bedrooms: number | null;
  bathrooms: number | null;
  price: number | null;
  status: "available" | "rented" | "maintenance" | null;
  lease_minimum: string | null;
  utilities_included: boolean;
  photos: string[] | null;
  created_at: string;
}

export interface Room {
  id: number;
  property_id: number;
  room_number: string;
  price: number;
  status: "vacant" | "occupied" | "maintenance";
  amenities: string[] | null; // JSONB array from Supabase
  photo_url: string | null;
  photos: string | null; // JSON string of photo paths array from Supabase (text column, not JSONB)
  description: string | null;
  created_at: string;
}

export interface Tenant {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  room_id: number | null;
  move_in_date: string | null;
  status: "active" | "moved_out";
  created_at: string;
}

export interface Payment {
  id: number;
  tenant_id: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: "upcoming" | "paid" | "overdue";
  notes: string | null;
  created_at: string;
}

export interface Inquiry {
  id: number;
  room_id: number | null;
  property_id: number | null;
  name: string;
  email: string;
  phone: string;
  employment_status: "employed" | "self_employed" | "student" | "unemployed" | "retired";
  income_range: "0_1000" | "1000_2000" | "2000_3000" | "3000_plus";
  desired_move_in: string;
  occupants: "1" | "2" | "3" | "4" | "5" | "6+";
  has_pets: "yes" | "no";
  background_check_consent: "yes" | "no";
  about: string | null;
  current_city: string | null;
  referral_source: string | null;
  preferred_contact: string | null;
  job_title: string | null;
  job_length: string | null;
  has_vehicle: string | null;
  preferred_tour_date: string | null;
  status: "new" | "reviewed" | "contacted" | "rejected";
  created_at: string;
}

export interface Expense {
  id: number;
  property_id: number;
  category: string;
  amount: number;
  month: string; // YYYY-MM format
  notes: string | null;
  created_at: string;
}

export interface LockCode {
  id: number;
  room_id: number;
  code: string;
  label: string;
  tenant_id: number | null;
  created_at: string;
}

export interface DashboardStats {
  totalProperties: number;
  totalRooms: number;
  totalTenants: number;
  occupancyRate: number;
  rentCollected: number;
  rentOutstanding: number;
  totalExpenses: number;
  netIncome: number;
}

// ─── CSV Import Types ─────────────────────────────────────────────────────────

export interface CsvTransaction {
  date: string;
  payee: string;
  accountNum: string;
  transactionType: string;
  description: string;
  status: string;
  amount: number;
  balance: number;
  rawRow: Record<string, string>;
}

export interface CategorizedTransaction {
  original: CsvTransaction;
  type: "expense" | "payment" | "skip";
  confidence: "high" | "medium" | "low";
  skipReason?: string;
  property_id?: number;
  category?: string;
  month?: string;
  tenant_id?: number;
  tenant_name?: string;
  due_date?: string;
  paid_date?: string;
  amount: number;
  notes?: string;
  isDuplicate?: boolean;
  included: boolean;
}

export interface ConfirmedTransaction {
  type: "expense" | "payment";
  property_id?: number;
  category?: string;
  amount: number;
  month?: string;
  notes?: string;
  tenant_id?: number;
  due_date?: string;
  paid_date?: string;
}

export interface ImportResult {
  expensesCreated: number;
  paymentsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}
