-- Let Edge Functions persist generated meeting details without exposing the write path to clients.

create or replace function public.set_appointment_meeting_details(
  target_appointment_id uuid,
  target_meeting_provider text,
  target_meeting_url text,
  target_meeting_code text,
  target_meeting_space_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointments
  set
    meeting_provider = target_meeting_provider,
    meeting_url = target_meeting_url,
    meeting_code = target_meeting_code,
    meeting_space_name = target_meeting_space_name
  where id = target_appointment_id;

  if not found then
    raise exception 'Appointment not found.';
  end if;
end;
$$;

revoke all on function public.set_appointment_meeting_details(uuid, text, text, text, text) from public;
grant execute on function public.set_appointment_meeting_details(uuid, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
