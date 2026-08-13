-- ============================================================
-- 033_company_requests_rpc.sql — Función RPC para Solicitudes de Empresa
-- ============================================================
-- Permite a los usuarios con rol Administrador Empresa / RRHH
-- consultar las solicitudes de sus colaboradores de forma segura.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_company_requests()
RETURNS TABLE (
  id UUID,
  topic TEXT,
  channel TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  employee_name TEXT,
  employee_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.topic,
    cr.channel,
    cr.status,
    cr.created_at,
    COALESCE(p.full_name, 'Colaborador') AS employee_name,
    COALESCE(p.email, '') AS employee_email
  FROM care_requests cr
  LEFT JOIN profiles p ON p.id = cr.employee_id
  ORDER BY cr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_requests() TO service_role;
