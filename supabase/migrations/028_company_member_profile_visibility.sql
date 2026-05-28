-- Allow company managers to read basic profile data for members of their company.
-- Without this, selectors can see company_members rows but not the linked profile names/emails.

drop policy if exists "profiles_select_company_members_for_manager" on public.profiles;

create policy "profiles_select_company_members_for_manager"
on public.profiles
for select
to authenticated
using (
  public.is_internal_admin()
  or id = auth.uid()
  or exists (
    select 1
    from public.company_members target_member
    join public.company_members viewer_member
      on viewer_member.company_id = target_member.company_id
    where target_member.user_id = profiles.id
      and viewer_member.user_id = auth.uid()
      and viewer_member.member_role in ('owner', 'manager', 'hr_admin')
  )
);
