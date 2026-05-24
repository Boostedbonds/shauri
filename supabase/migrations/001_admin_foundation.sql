-- 001_admin_foundation.sql
-- Purpose: foundational objects for admin hardening (helpers, allowlist, profiles, safety columns).
-- Safe: idempotent and rerunnable.

begin;

create extension if not exists pgcrypto;

create schema if not exists shauri_private;

create table if not exists public.admin_allowlist (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null
);

create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text null,
  class_level text null,
  board text null default 'CBSE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users(id) on delete set null,
  actor_email text null,
  action text not null,
  target_table text null,
  target_id text null,
  request_id text null,
  ip inet null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text null,
  event text not null,
  success boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.student_profiles') is not null then
    if not exists (
      select 1 from pg_trigger
      where tgname = 'trg_student_profiles_updated_at'
    ) then
      create trigger trg_student_profiles_updated_at
      before update on public.student_profiles
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with u as (
    select
      id,
      lower(email) as email,
      coalesce(raw_app_meta_data->>'role', raw_user_meta_data->>'role', '') as role
    from auth.users
    where id = p_user_id
  )
  select exists(
    select 1
    from u
    left join public.admin_allowlist a on a.email = u.email and a.active = true
    where u.role in ('admin', 'super_admin') or a.email is not null
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to anon, authenticated, service_role;

create or replace function public.safe_user_email(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(email) from auth.users where id = p_user_id;
$$;

revoke all on function public.safe_user_email(uuid) from public;
grant execute on function public.safe_user_email(uuid) to authenticated, service_role;

do $$
begin
  if to_regclass('public.exam_attempts') is not null then
    alter table public.exam_attempts
      add column if not exists user_id uuid null references auth.users(id) on delete set null;
    alter table public.exam_attempts
      add column if not exists created_at timestamptz not null default now();
    alter table public.exam_attempts
      add column if not exists updated_at timestamptz not null default now();
    if not exists (select 1 from pg_trigger where tgname = 'trg_exam_attempts_updated_at') then
      create trigger trg_exam_attempts_updated_at
      before update on public.exam_attempts
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.knowledge_base') is not null then
    alter table public.knowledge_base
      add column if not exists created_by uuid null references auth.users(id) on delete set null;
    alter table public.knowledge_base
      add column if not exists created_at timestamptz not null default now();
    alter table public.knowledge_base
      add column if not exists updated_at timestamptz not null default now();
    if not exists (select 1 from pg_trigger where tgname = 'trg_knowledge_base_updated_at') then
      create trigger trg_knowledge_base_updated_at
      before update on public.knowledge_base
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

commit;

