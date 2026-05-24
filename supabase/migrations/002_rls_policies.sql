-- 002_rls_policies.sql
-- Purpose: enforce RLS and least-privilege policies for admin/student data isolation.
-- Safe: idempotent and resilient in Supabase SQL editor.

begin;

create schema if not exists shauri_private;

create or replace function shauri_private.ensure_rls_enabled(p_table regclass)
returns void
language plpgsql
as $$
begin
  execute format('alter table %s enable row level security', p_table);
end;
$$;

do $$
begin
  if to_regclass('public.student_profiles') is not null then
    perform shauri_private.ensure_rls_enabled('public.student_profiles');

    if not exists (select 1 from pg_policy where polname = 'student_profiles_select_own_or_admin' and polrelid = 'public.student_profiles'::regclass) then
      create policy student_profiles_select_own_or_admin
      on public.student_profiles
      for select
      to authenticated
      using (auth.uid() = user_id or public.is_admin_user(auth.uid()));
    end if;

    if not exists (select 1 from pg_policy where polname = 'student_profiles_insert_own_or_admin' and polrelid = 'public.student_profiles'::regclass) then
      create policy student_profiles_insert_own_or_admin
      on public.student_profiles
      for insert
      to authenticated
      with check (auth.uid() = user_id or public.is_admin_user(auth.uid()));
    end if;

    if not exists (select 1 from pg_policy where polname = 'student_profiles_update_own_or_admin' and polrelid = 'public.student_profiles'::regclass) then
      create policy student_profiles_update_own_or_admin
      on public.student_profiles
      for update
      to authenticated
      using (auth.uid() = user_id or public.is_admin_user(auth.uid()))
      with check (auth.uid() = user_id or public.is_admin_user(auth.uid()));
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.exam_attempts') is not null then
    perform shauri_private.ensure_rls_enabled('public.exam_attempts');

    if not exists (select 1 from pg_policy where polname = 'exam_attempts_admin_full_access' and polrelid = 'public.exam_attempts'::regclass) then
      create policy exam_attempts_admin_full_access
      on public.exam_attempts
      for all
      to authenticated
      using (public.is_admin_user(auth.uid()))
      with check (public.is_admin_user(auth.uid()));
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'exam_attempts' and column_name = 'user_id'
    ) then
      if not exists (select 1 from pg_policy where polname = 'exam_attempts_student_select_own' and polrelid = 'public.exam_attempts'::regclass) then
        create policy exam_attempts_student_select_own
        on public.exam_attempts
        for select
        to authenticated
        using (user_id = auth.uid());
      end if;

      if not exists (select 1 from pg_policy where polname = 'exam_attempts_student_insert_own' and polrelid = 'public.exam_attempts'::regclass) then
        create policy exam_attempts_student_insert_own
        on public.exam_attempts
        for insert
        to authenticated
        with check (user_id = auth.uid());
      end if;

      if not exists (select 1 from pg_policy where polname = 'exam_attempts_student_update_own' and polrelid = 'public.exam_attempts'::regclass) then
        create policy exam_attempts_student_update_own
        on public.exam_attempts
        for update
        to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
      end if;
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.knowledge_base') is not null then
    perform shauri_private.ensure_rls_enabled('public.knowledge_base');

    if not exists (select 1 from pg_policy where polname = 'knowledge_base_admin_full_access' and polrelid = 'public.knowledge_base'::regclass) then
      create policy knowledge_base_admin_full_access
      on public.knowledge_base
      for all
      to authenticated
      using (public.is_admin_user(auth.uid()))
      with check (public.is_admin_user(auth.uid()));
    end if;

    if not exists (select 1 from pg_policy where polname = 'knowledge_base_student_read_active_only' and polrelid = 'public.knowledge_base'::regclass) then
      create policy knowledge_base_student_read_active_only
      on public.knowledge_base
      for select
      to authenticated
      using (active = true);
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_allowlist') is not null then
    perform shauri_private.ensure_rls_enabled('public.admin_allowlist');

    if not exists (select 1 from pg_policy where polname = 'admin_allowlist_admin_only' and polrelid = 'public.admin_allowlist'::regclass) then
      create policy admin_allowlist_admin_only
      on public.admin_allowlist
      for all
      to authenticated
      using (public.is_admin_user(auth.uid()))
      with check (public.is_admin_user(auth.uid()));
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_audit_logs') is not null then
    perform shauri_private.ensure_rls_enabled('public.admin_audit_logs');

    if not exists (select 1 from pg_policy where polname = 'admin_audit_logs_admin_select' and polrelid = 'public.admin_audit_logs'::regclass) then
      create policy admin_audit_logs_admin_select
      on public.admin_audit_logs
      for select
      to authenticated
      using (public.is_admin_user(auth.uid()));
    end if;

    if not exists (select 1 from pg_policy where polname = 'admin_audit_logs_admin_insert' and polrelid = 'public.admin_audit_logs'::regclass) then
      create policy admin_audit_logs_admin_insert
      on public.admin_audit_logs
      for insert
      to authenticated
      with check (public.is_admin_user(auth.uid()));
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.auth_activity_logs') is not null then
    perform shauri_private.ensure_rls_enabled('public.auth_activity_logs');

    if not exists (select 1 from pg_policy where polname = 'auth_activity_logs_admin_select' and polrelid = 'public.auth_activity_logs'::regclass) then
      create policy auth_activity_logs_admin_select
      on public.auth_activity_logs
      for select
      to authenticated
      using (public.is_admin_user(auth.uid()));
    end if;

    if not exists (select 1 from pg_policy where polname = 'auth_activity_logs_insert_self_or_admin' and polrelid = 'public.auth_activity_logs'::regclass) then
      create policy auth_activity_logs_insert_self_or_admin
      on public.auth_activity_logs
      for insert
      to authenticated
      with check (user_id = auth.uid() or public.is_admin_user(auth.uid()));
    end if;
  end if;
end $$;

commit;

