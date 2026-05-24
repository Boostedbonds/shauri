-- 008_post_run_verification.sql
-- Purpose: run after migrations to validate security, schema, and performance posture.
-- This file is read-only verification (no mutations).

-- 1) Required tables present
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'exam_attempts',
    'knowledge_base',
    'student_profiles',
    'admin_allowlist',
    'admin_audit_logs',
    'auth_activity_logs'
  )
order by table_name;

-- 2) RLS enabled on critical tables
select * from public.v_table_rls_status
where schemaname = 'public'
  and tablename in (
    'exam_attempts',
    'knowledge_base',
    'student_profiles',
    'admin_allowlist',
    'admin_audit_logs',
    'auth_activity_logs'
  )
order by tablename;

-- 3) Policy matrix for critical tables
select * from public.v_policy_matrix
where schemaname in ('public', 'storage')
  and tablename in (
    'exam_attempts',
    'knowledge_base',
    'student_profiles',
    'admin_allowlist',
    'admin_audit_logs',
    'auth_activity_logs',
    'objects'
  )
order by schemaname, tablename, policyname;

-- 4) Missing index report (must return 0 rows)
select * from public.v_missing_recommended_indexes;

-- 5) Integrity summary
select public.admin_integrity_report();

-- 6) Admin check smoke test (run as authenticated admin in SQL editor with jwt context)
-- expected true for admin user
select public.is_admin_user(auth.uid()) as is_admin;

-- 7) Allowlist sanity
select email, active, created_at
from public.admin_allowlist
order by created_at desc
limit 50;

-- 8) Trigger coverage
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('exam_attempts', 'knowledge_base', 'admin_allowlist', 'student_profiles')
order by table_name, trigger_name;

-- 9) Storage bucket posture
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'admin-kb';

-- 10) Latest admin audit events
select created_at, actor_email, action, target_table, target_id
from public.admin_audit_logs
order by created_at desc
limit 50;

