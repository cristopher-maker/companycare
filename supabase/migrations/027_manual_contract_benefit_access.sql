-- Allow manual pilot contracts to unlock benefits before an online payment is completed.

create or replace function public.can_company_use_benefits(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = target_company_id
      and c.operational_status in ('onboarding', 'active')
      and (
        public.company_has_active_subscription(c.id)
        or exists (
          select 1
          from public.company_contracts cc
          where cc.company_id = c.id
            and cc.status = 'active'
            and (cc.ends_at is null or cc.ends_at >= current_date)
        )
      )
  );
$$;

create or replace function public.employee_has_active_benefit_access(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.user_id = target_employee_id
      and public.can_company_use_benefits(cm.company_id)
  )
  or exists (
    select 1
    from public.benefit_entitlements be
    where be.employee_id = target_employee_id
      and be.status = 'active'
      and be.starts_at <= now()
      and (be.ends_at is null or be.ends_at >= now())
  )
  or exists (
    select 1
    from public.benefit_entitlements be
    join public.company_members cm on cm.company_id = be.company_id
    where cm.user_id = target_employee_id
      and be.employee_id is null
      and be.status = 'active'
      and be.starts_at <= now()
      and (be.ends_at is null or be.ends_at >= now())
  );
$$;

drop policy if exists "care_requests_insert_own" on public.care_requests;
create policy "care_requests_insert_own"
on public.care_requests for insert
to authenticated
with check (
  employee_id = auth.uid()
  and (
    public.employee_has_active_benefit_access(employee_id)
    or public.is_staff()
  )
);
