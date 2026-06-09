-- Store core care receiver identity fields as queryable columns.

alter table public.care_intakes
  add column if not exists care_receiver_full_name text,
  add column if not exists care_receiver_rut text,
  add column if not exists care_receiver_birth_date date,
  add column if not exists care_receiver_phone text,
  add column if not exists care_receiver_health_coverage text;

create index if not exists idx_care_intakes_receiver_rut
on public.care_intakes (care_receiver_rut);

create index if not exists idx_care_intakes_receiver_full_name
on public.care_intakes (care_receiver_full_name);

notify pgrst, 'reload schema';
