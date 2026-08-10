-- ============================================================
-- care_intakes — Ficha de Ingreso y Evaluación de Caso Senior
-- ============================================================
-- Almacena el contexto clínico, familiar y de vivienda del
-- adulto mayor, incluyendo si la casa tiene 2 o más pisos / escaleras.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.care_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Datos directos del beneficiario para filtros rápidos
  care_receiver_full_name TEXT,
  care_receiver_rut TEXT,
  care_receiver_birth_date DATE,
  care_receiver_phone TEXT,
  care_receiver_health_coverage TEXT,

  -- Payload completo (JSONB)
  -- Incluye: care_type, care_receiver, location (city, postal_code, has_two_floors),
  -- family_context, budget, preferences, urgency, caregiver, notes.
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security & Políticas
-- ============================================================
ALTER TABLE public.care_intakes ENABLE ROW LEVEL SECURITY;

-- Empleado puede ver y gestionar sus propias fichas
CREATE POLICY "employee_manage_own_intakes" ON public.care_intakes
  FOR ALL USING (auth.uid() = employee_id);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_care_intakes_employee ON public.care_intakes(employee_id);
CREATE INDEX IF NOT EXISTS idx_care_intakes_company ON public.care_intakes(company_id);
CREATE INDEX IF NOT EXISTS idx_care_intakes_payload_has_two_floors ON public.care_intakes ((payload->'location'->>'has_two_floors'));
