-- ============================================================
-- 034_company_monitoring_rls.sql — Acceso de lectura para RRHH
-- ============================================================
-- Permite que los roles company_admin y hr_admin puedan VER
-- las solicitudes de care_requests y los seguimientos de 
-- patient_followups para el dashboard de monitoreo.
-- ============================================================

-- 1. Acceso de LECTURA a care_requests para roles de empresa
CREATE POLICY "company_read_all_requests" ON care_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('company_admin', 'hr_admin')
    )
  );

-- 2. Acceso de LECTURA a patient_followups para roles de empresa
CREATE POLICY "company_read_all_followups" ON patient_followups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('company_admin', 'hr_admin')
    )
  );

-- 3. Acceso de LECTURA a profiles para resolver nombres
-- (puede que ya exista una política similar, si da error de duplicado, ignorar)
CREATE POLICY "company_read_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() 
      AND p.role IN ('company_admin', 'hr_admin')
    )
  );
