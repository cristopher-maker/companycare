create or replace function public.create_lead_from_care_intake()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_name text;
  care_type text;
  city text;
  dependency text;
  budget numeric;
begin
  if new.company_id is null or new.employee_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.leads l
    where l.company_id = new.company_id
      and l.employee_id = new.employee_id
  ) then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), 'Empleado')
  into employee_name
  from public.profiles p
  where p.id = new.employee_id;

  employee_name := coalesce(employee_name, 'Empleado');
  care_type := public.care_type_label(new.payload #>> '{care_type}');
  city := nullif(trim(coalesce(new.payload #>> '{location,city}', '')), '');
  dependency := public.dependency_level_label(new.payload #>> '{care_receiver,dependency_level}');

  begin
    budget := nullif(new.payload #>> '{budget,monthly_max}', '')::numeric;
  exception when invalid_text_representation then
    budget := null;
  end;

  insert into public.leads (
    company_id,
    employee_id,
    nombre,
    comuna,
    dependencia,
    presupuesto,
    telefono,
    estado
  )
  values (
    new.company_id,
    new.employee_id,
    'Solicitud: ' || employee_name || ' (' || care_type || ')',
    city,
    dependency,
    budget,
    nullif(trim(coalesce(new.payload #>> '{care_receiver,phone}', '')), ''),
    'nuevo'
  );

  return new;
end;
$$;

notify pgrst, 'reload schema';
