-- ============================================================
-- 032_care_requests_rls.sql — Políticas RLS para care_requests y Care Experts
-- ============================================================
-- Permite que los empleados gestionen sus propias solicitudes y que
-- los Care Experts / Admins puedan ver y gestionar todos los casos.
-- ============================================================

ALTER TABLE care_requests ENABLE ROW LEVEL SECURITY;

-- 1. Empleados pueden ver y crear sus propias solicitudes
CREATE POLICY "employees_read_own_requests" ON care_requests
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "employees_insert_own_requests" ON care_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- 2. Care Experts y Admins pueden gestionar todas las solicitudes
CREATE POLICY "experts_manage_all_requests" ON care_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('care_expert', 'admin')
    )
  );
