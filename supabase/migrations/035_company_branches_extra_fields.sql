-- Add comprehensive branch management fields to providers table
-- (providers already serves as the sede/branch table for companies)

alter table public.providers
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists region text,
  add column if not exists encargado_name text,
  add column if not exists encargado_phone text,
  add column if not exists encargado_email text,
  add column if not exists branch_status text default 'activa',
  add column if not exists notes text;

create index if not exists idx_providers_branch_status on public.providers (branch_status);

notify pgrst, 'reload schema';
