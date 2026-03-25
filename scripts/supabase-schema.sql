-- Fruitful Rooms — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables, indexes, RLS, functions, and views.

-- ─── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE properties (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  amenities JSONB,
  photo_url TEXT,
  photos JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
  move_in_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'moved_out')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inquiries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  employment_status TEXT NOT NULL CHECK (employment_status IN ('employed', 'self_employed', 'student', 'unemployed', 'retired')),
  income_range TEXT NOT NULL CHECK (income_range IN ('0_1000', '1000_2000', '2000_3000', '3000_plus')),
  desired_move_in TEXT NOT NULL,
  occupants TEXT NOT NULL DEFAULT '1' CHECK (occupants IN ('1', '2')),
  has_pets TEXT NOT NULL DEFAULT 'no' CHECK (has_pets IN ('yes', 'no')),
  background_check_consent TEXT NOT NULL DEFAULT 'no' CHECK (background_check_consent IN ('yes', 'no')),
  about TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('mortgage', 'electricity', 'water', 'internet', 'pest_control', 'repairs', 'cleaning', 'lender_payment', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  month TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_rooms_property_status ON rooms(property_id, status);
CREATE INDEX idx_inquiries_room_id ON inquiries(room_id);
CREATE INDEX idx_tenants_room_id ON tenants(room_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_expenses_property_month ON expenses(property_id, month);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- ─── Row Level Security ────────────────────────────────────────────────────
-- service_role key bypasses RLS entirely, so we only need public policies.

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read properties and rooms (for listings)
CREATE POLICY "Public read properties" ON properties FOR SELECT USING (true);
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);

-- Public: anyone can submit inquiries
CREATE POLICY "Public insert inquiries" ON inquiries FOR INSERT WITH CHECK (true);

-- ─── Dashboard Stats Function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_property_id BIGINT DEFAULT NULL, p_current_month TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month TEXT;
  v_total_properties INT;
  v_total_rooms INT;
  v_total_tenants INT;
  v_occupied_rooms INT;
  v_occupancy_rate INT;
  v_rent_collected NUMERIC(10,2);
  v_rent_outstanding NUMERIC(10,2);
  v_total_expenses NUMERIC(10,2);
BEGIN
  v_month := COALESCE(p_current_month, to_char(now(), 'YYYY-MM'));

  IF p_property_id IS NOT NULL THEN
    v_total_properties := 1;
  ELSE
    SELECT COUNT(*) INTO v_total_properties FROM properties;
  END IF;

  IF p_property_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_rooms FROM rooms WHERE property_id = p_property_id;
  ELSE
    SELECT COUNT(*) INTO v_total_rooms FROM rooms;
  END IF;

  IF p_property_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_tenants
    FROM tenants t JOIN rooms r ON t.room_id = r.id
    WHERE t.status = 'active' AND r.property_id = p_property_id;
  ELSE
    SELECT COUNT(*) INTO v_total_tenants FROM tenants WHERE status = 'active';
  END IF;

  IF p_property_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_occupied_rooms FROM rooms WHERE status = 'occupied' AND property_id = p_property_id;
  ELSE
    SELECT COUNT(*) INTO v_occupied_rooms FROM rooms WHERE status = 'occupied';
  END IF;

  IF v_total_rooms > 0 THEN
    v_occupancy_rate := ROUND((v_occupied_rooms::NUMERIC / v_total_rooms) * 100);
  ELSE
    v_occupancy_rate := 0;
  END IF;

  IF p_property_id IS NOT NULL THEN
    SELECT COALESCE(SUM(p.amount), 0) INTO v_rent_collected
    FROM payments p
    JOIN tenants t ON p.tenant_id = t.id
    JOIN rooms r ON t.room_id = r.id
    WHERE p.status = 'paid'
      AND substring(p.due_date FROM 1 FOR 7) = v_month
      AND r.property_id = p_property_id;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_rent_collected
    FROM payments
    WHERE status = 'paid' AND substring(due_date FROM 1 FOR 7) = v_month;
  END IF;

  IF p_property_id IS NOT NULL THEN
    SELECT COALESCE(SUM(p.amount), 0) INTO v_rent_outstanding
    FROM payments p
    JOIN tenants t ON p.tenant_id = t.id
    JOIN rooms r ON t.room_id = r.id
    WHERE p.status IN ('upcoming', 'overdue')
      AND substring(p.due_date FROM 1 FOR 7) = v_month
      AND r.property_id = p_property_id;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_rent_outstanding
    FROM payments
    WHERE status IN ('upcoming', 'overdue') AND substring(due_date FROM 1 FOR 7) = v_month;
  END IF;

  IF p_property_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM expenses WHERE month = v_month AND property_id = p_property_id;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM expenses WHERE month = v_month;
  END IF;

  RETURN json_build_object(
    'totalProperties', v_total_properties,
    'totalRooms', v_total_rooms,
    'totalTenants', v_total_tenants,
    'occupancyRate', v_occupancy_rate,
    'rentCollected', v_rent_collected,
    'rentOutstanding', v_rent_outstanding,
    'totalExpenses', v_total_expenses,
    'netIncome', v_rent_collected - v_total_expenses
  );
END;
$$;

-- ─── Public Properties View ────────────────────────────────────────────────

CREATE OR REPLACE VIEW public_properties_with_vacancies AS
SELECT
  p.*,
  COUNT(r.id) AS vacant_count,
  MIN(r.price) AS min_price
FROM properties p
JOIN rooms r ON r.property_id = p.id AND r.status = 'vacant'
GROUP BY p.id
HAVING COUNT(r.id) > 0
ORDER BY p.name;
