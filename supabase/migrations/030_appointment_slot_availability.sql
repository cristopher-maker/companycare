-- Expose occupied appointment slots without leaking appointment/customer details.

create or replace function public.get_booked_appointment_slots(target_date date, target_kind text)
returns table(slot text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct to_char(a.scheduled_for at time zone 'America/Santiago', 'HH24:MI') as slot
  from public.appointments a
  where (a.scheduled_for at time zone 'America/Santiago')::date = target_date
    and a.kind = target_kind
    and a.status in ('scheduled', 'confirmed');
$$;

grant execute on function public.get_booked_appointment_slots(date, text) to authenticated;

create unique index if not exists uq_appointments_active_kind_slot
on public.appointments (kind, scheduled_for)
where status in ('scheduled', 'confirmed');

notify pgrst, 'reload schema';
