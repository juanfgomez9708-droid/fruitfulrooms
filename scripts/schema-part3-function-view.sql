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
