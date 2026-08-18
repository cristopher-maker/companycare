-- ============================================================
-- 035_company_isolated_monitoring_rls.sql
-- Restringe la lectura de solicitudes y seguimientos en Supabase
-- para que RRHH y Administradores de Empresa SOLAMENTE vean los casos
-- pertenecientes a colaboradores de SU MISMA EMPRESA.
-- ============================================================

-- 1. Eliminar política previa que permitía leer todas las solicitudes
DROP POLICY IF EXISTS "company_read_all_requests" ON care_requests;
DROP POLICY IF EXISTS "company_read_own_company_requests" ON care_requests;

-- 2. Crear política aislada por empresa para care_requests
CREATE POLICY "company_read_own_company_requests" ON care_requests
  FOR SELECT USING (
    -- Admins globales pueden ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Roles de empresa solo ven colaboradores de su misma empresa
    EXISTS (
      SELECT 1 
      FROM company_members cm_hr
      JOIN company_members cm_emp ON cm_hr.company_id = cm_emp.company_id
      WHERE cm_hr.user_id = auth.uid()
        AND cm_emp.user_id = care_requests.employee_id
    )
  );

-- 3. Eliminar política previa que permitía leer todos los seguimientos
DROP POLICY IF EXISTS "company_read_all_followups" ON patient_followups;
DROP POLICY IF EXISTS "company_read_own_company_followups" ON patient_followups;

-- 4. Crear política aislada por empresa para patient_followups
CREATE POLICY "company_read_own_company_followups" ON patient_followups
  FOR SELECT USING (
    -- Admins globales pueden ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Roles de empresa solo ven seguimientos de colaboradores de su misma empresa
    EXISTS (
      SELECT 1 
      FROM company_members cm_hr
      JOIN company_members cm_emp ON cm_hr.company_id = cm_emp.company_id
      WHERE cm_hr.user_id = auth.uid()
        AND cm_emp.user_id = patient_followups.employee_id
    )
  );
