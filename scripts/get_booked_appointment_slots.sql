-- ============================================================
-- FUNCIÓN: get_booked_appointment_slots
-- Proyecto Supabase: ddysqiaeojmlziesndgh
--
-- IMPORTANTE SOBRE ZONA HORARIA:
-- El frontend crea el timestamp con: new Date(`${date}T${time}:00`)
-- Eso usa la zona local del NAVEGADOR del usuario.
-- Si tus usuarios están en Chile → America/Santiago
-- Si están en Venezuela → America/Caracas
-- Ajusta 'America/Santiago' abajo según tu país.
-- ============================================================

CREATE OR REPLACE FUNCTION get_booked_appointment_slots(
  target_date DATE,
  target_kind TEXT
)
RETURNS TABLE(slot TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(
      -- Convierte el timestamp UTC guardado en BD a hora local
      (scheduled_for AT TIME ZONE 'America/Caracas'),
      'HH24:MI'
    ) AS slot
  FROM appointments
  WHERE
    -- Mismo día en hora local
    DATE(scheduled_for AT TIME ZONE 'America/Caracas') = target_date
    -- Mismo tipo de cita
    AND kind = target_kind
    -- Solo citas activas (no canceladas, no completadas)
    AND status IN ('scheduled', 'confirmed')
  GROUP BY slot
  ORDER BY slot;
$$;

-- Permiso para usuarios autenticados
GRANT EXECUTE ON FUNCTION get_booked_appointment_slots(DATE, TEXT) TO authenticated;


-- ============================================================
-- ÍNDICE ÚNICO (protección a nivel de BD contra doble reserva)
-- Ejecutar solo una vez. Si ya existe el constraint
-- 'uq_appointments_active_kind_slot' en tu tabla, omite esto.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_kind_slot
  ON appointments (kind, scheduled_for)
  WHERE status IN ('scheduled', 'confirmed');
