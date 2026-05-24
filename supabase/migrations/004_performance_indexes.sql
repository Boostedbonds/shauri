-- 004_performance_indexes.sql
-- Purpose: production indexes for dashboard, RLS paths, sorting, and pagination.

begin;

do $$
begin
  if to_regclass('public.exam_attempts') is not null then
    create index if not exists idx_exam_attempts_created_at_desc on public.exam_attempts (created_at desc);
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'exam_attempts'
        and column_name = 'user_id'
    ) then
      create index if not exists idx_exam_attempts_user_id_created_at_desc on public.exam_attempts (user_id, created_at desc);
    end if;
    create index if not exists idx_exam_attempts_student_class on public.exam_attempts (student_name, class);
    create index if not exists idx_exam_attempts_subject_created_at on public.exam_attempts (subject, created_at desc);
    create index if not exists idx_exam_attempts_day on public.exam_attempts (day);
  end if;
end $$;

do $$
begin
  if to_regclass('public.knowledge_base') is not null then
    create index if not exists idx_knowledge_base_active_created_at_desc on public.knowledge_base (active, created_at desc);
    create index if not exists idx_knowledge_base_subject_class on public.knowledge_base (subject, class_level);
    create index if not exists idx_knowledge_base_created_by on public.knowledge_base (created_by);
    create index if not exists idx_knowledge_base_tags_gin on public.knowledge_base using gin (tags);
  end if;
end $$;

do $$
begin
  if to_regclass('public.student_profiles') is not null then
    create index if not exists idx_student_profiles_class_level on public.student_profiles (class_level);
    create index if not exists idx_student_profiles_board on public.student_profiles (board);
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_audit_logs') is not null then
    create index if not exists idx_admin_audit_logs_created_at_desc on public.admin_audit_logs (created_at desc);
    create index if not exists idx_admin_audit_logs_actor_created_at_desc on public.admin_audit_logs (actor_user_id, created_at desc);
    create index if not exists idx_admin_audit_logs_action_created_at_desc on public.admin_audit_logs (action, created_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.auth_activity_logs') is not null then
    create index if not exists idx_auth_activity_logs_created_at_desc on public.auth_activity_logs (created_at desc);
    create index if not exists idx_auth_activity_logs_user_created_at_desc on public.auth_activity_logs (user_id, created_at desc);
    create index if not exists idx_auth_activity_logs_event on public.auth_activity_logs (event);
  end if;
end $$;

commit;
