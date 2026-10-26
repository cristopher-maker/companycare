-- ============================================================
-- SCRIPT DE BLINDAJE CONTRA DOBLE RESERVA (CONCURRENCIA)
-- Proyecto Supabase: Company Care
-- ============================================================

-- 1. ASEGURAR ÍNDICE ÚNICO CONDICIONAL EN TABLA APPOINTMENTS
-- Impide físicamente a nivel de motor PostgreSQL que existan 2 citas con el mismo
-- tipo (Videollamada/Llamada) y fecha/hora mientras estén activas ('scheduled', 'confirmed').
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_kind_slot
  ON appointments (kind, scheduled_for)
  WHERE status IN ('scheduled', 'confirmed');

-- 2. FUNCIÓN ATÓMICA DE RESERVA (book_appointment)
-- Ejecuta la creación de la solicitud y la cita en una sola transacción ACID.
-- Si el horario ya fue tomado por otro usuario una fracción de segundo antes,
-- la transacción revierte automáticamente (ROLLBACK) y no deja registros huérfanos.
CREATE OR REPLACE FUNCTION book_appointment(
  p_employee_id UUID,
  p_channel TEXT,
  p_topic TEXT,
  p_details TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_appointment_id UUID;
  v_slot_exists BOOLEAN;
BEGIN
  -- Verificación previa dentro de la transacción
  SELECT EXISTS(
    SELECT 1 FROM appointments
    WHERE kind = p_channel
      AND scheduled_for = p_scheduled_for
      AND status IN ('scheduled', 'confirmed')
  ) INTO v_slot_exists;

  IF v_slot_exists THEN
    RAISE EXCEPTION 'SLOT_ALREADY_BOOKED'
      USING DETAIL = 'El horario seleccionado ya no se encuentra disponible.',
            ERRCODE = 'P0001';
  END IF;

  -- Insertar solicitud (care_requests)
  INSERT INTO care_requests (
    employee_id,
    channel,
    topic,
    details
  ) VALUES (
    p_employee_id,
    p_channel,
    p_topic,
    p_details
  ) RETURNING id INTO v_request_id;

  -- Insertar cita (appointments)
  -- El índice uq_appointments_active_kind_slot protegerá en caso de colisión simultánea
  INSERT INTO appointments (
    request_id,
    employee_id,
    expert_id,
    kind,
    scheduled_for,
    notes,
    created_by
  ) VALUES (
    v_request_id,
    p_employee_id,
    NULL,
    p_channel,
    p_scheduled_for,
    p_notes,
    p_employee_id
  ) RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'appointment_id', v_appointment_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLOT_ALREADY_BOOKED'
      USING DETAIL = 'El horario seleccionado ya no se encuentra disponible.',
            ERRCODE = 'P0001';
END;
$$;

-- Permisos de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION book_appointment(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

-- 3. HABILITAR REALTIME EN LA TABLA APPOINTMENTS
-- Para que cualquier cambio (INSERT, UPDATE, DELETE) se transmita de inmediato vía WebSockets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;
END $$;
