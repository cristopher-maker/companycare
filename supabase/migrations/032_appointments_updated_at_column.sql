-- Some remote projects have the appointments updated_at trigger without the column.

alter table public.appointments
  add column if not exists updated_at timestamptz not null default now();

notify pgrst, 'reload schema';
