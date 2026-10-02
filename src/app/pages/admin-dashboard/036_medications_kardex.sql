-- ============================================================
-- 036_medications_kardex.sql — Kardex e-MAR para Residencias ELEAM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT 'oral' CHECK (route IN (
    'oral', 'sublingual', 'subcutanea', 'intramuscular', 'dermica', 'oftalmica', 'inhalatoria', 'rectal', 'otra'
  )),
  schedule_times JSONB NOT NULL DEFAULT '["08:00"]'::jsonb,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  instructions TEXT,
  prescribed_by TEXT,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'discontinued')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.patient_medications (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'administered', 'rejected', 'suspended', 'vomited'
  )),
  administered_by UUID REFERENCES auth.users (id),
  administered_by_name TEXT,
  administered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_med_date_time UNIQUE (medication_id, scheduled_date, scheduled_time)
);

CREATE INDEX IF NOT EXISTS idx_patient_meds_patient ON public.patient_medications (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_meds_company ON public.patient_medications (company_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_date ON public.medication_administrations (scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_med_admin_patient ON public.medication_administrations (patient_id, scheduled_date);

ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_medications_company_select"
ON public.patient_medications FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "patient_medications_company_manage"
ON public.patient_medications FOR ALL
TO authenticated
USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "medication_administrations_company_select"
ON public.medication_administrations FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "medication_administrations_company_manage"
ON public.medication_administrations FOR ALL
TO authenticated
USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));
