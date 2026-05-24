-- 003_admin_authz_helpers.sql
-- Purpose: reusable SQL helpers for admin verification and safe audit logging.

begin;

create or replace function public.assert_is_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_is_admin() from public;
grant execute on function public.assert_is_admin() to authenticated, service_role;

create or replace function public.log_admin_action(
  p_action text,
  p_target_table text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    auth.uid(),
    public.safe_user_email(auth.uid()),
    p_action,
    p_target_table,
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_admin_action(text, text, text, jsonb) from public;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated, service_role;

create or replace function public.log_auth_event(
  p_event text,
  p_success boolean default true,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.auth_activity_logs (
    user_id,
    email,
    event,
    success,
    details
  )
  values (
    auth.uid(),
    public.safe_user_email(auth.uid()),
    p_event,
    p_success,
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.log_auth_event(text, boolean, jsonb) from public;
grant execute on function public.log_auth_event(text, boolean, jsonb) to authenticated, service_role;

commit;

