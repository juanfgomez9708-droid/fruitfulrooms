export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  description: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Room {
  id: number;
  property_id: number;
  room_number: string;
  price: number;
  status: "vacant" | "occupied" | "maintenance";
  amenities: string | null; // JSON array as string
  photo_url: string | null;
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
  room_id: number;
  name: string;
  email: string;
  phone: string;
  employment_status: "employed" | "self_employed" | "student" | "unemployed" | "retired";
  income_range: "0_1000" | "1000_2000" | "2000_3000" | "3000_plus";
  desired_move_in: string;
  occupants: "1" | "2";
  has_pets: "yes" | "no";
  background_check_consent: "yes" | "no";
  about: string | null;
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
