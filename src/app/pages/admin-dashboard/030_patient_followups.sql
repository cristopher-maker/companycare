-- ============================================================
-- patient_followups — Seguimiento de pacientes por Care Experts
-- ============================================================
-- Tabla que permite a los Care Experts registrar notas de 
-- evolución sobre el familiar del empleado, y que el empleado
-- pueda ver el estado actualizado en su Dashboard.
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relaciones
  request_id UUID REFERENCES care_requests(id) ON DELETE CASCADE,
  expert_id UUID REFERENCES auth.users(id),
  employee_id UUID NOT NULL,

  -- Estado del familiar
  patient_status TEXT CHECK (patient_status IN (
    'estable', 'mejorando', 'sin_cambios', 'empeorando',
    'requiere_atencion', 'alta', 'derivado'
  )) NOT NULL DEFAULT 'estable',

  -- Contenido
  note TEXT NOT NULL,           -- Nota visible para el empleado
  internal_note TEXT,           -- Nota interna (solo Care Experts)

  -- Tipo de contacto realizado
  followup_type TEXT CHECK (followup_type IN (
    'llamada', 'videollamada', 'chat', 'presencial', 'nota_interna'
  )) DEFAULT 'nota_interna',

  -- Programación del próximo seguimiento
  next_followup_date TIMESTAMPTZ,
  priority TEXT CHECK (priority IN (
    'baja', 'media', 'alta', 'urgente'
  )) DEFAULT 'media',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE patient_followups ENABLE ROW LEVEL SECURITY;

-- El empleado puede VER las notas de su propio caso
CREATE POLICY "employee_read_own_followups" ON patient_followups
  FOR SELECT USING (auth.uid() = employee_id);

-- El Care Expert puede gestionar los seguimientos que creó
CREATE POLICY "expert_manage_followups" ON patient_followups
  FOR ALL USING (auth.uid() = expert_id);

-- Índices para consultas frecuentes
CREATE INDEX idx_followups_employee ON patient_followups(employee_id, created_at DESC);
CREATE INDEX idx_followups_request ON patient_followups(request_id, created_at DESC);
CREATE INDEX idx_followups_expert_pending ON patient_followups(expert_id, next_followup_date)
  WHERE next_followup_date IS NOT NULL;
