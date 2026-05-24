-- 007_validation_utilities.sql
-- Purpose: inspection and verification utilities for schema/policy/index/admin integrity.

begin;

create or replace view public.v_schema_columns as
select
  n.nspname as schema_name,
  c.relname as table_name,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  not a.attnotnull as is_nullable,
  pg_get_expr(ad.adbin, ad.adrelid) as default_value
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where a.attnum > 0
  and not a.attisdropped
  and n.nspname in ('public', 'storage');

create or replace view public.v_table_rls_status as
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
join pg_class on pg_class.relname = pg_tables.tablename
join pg_namespace n on n.oid = pg_class.relnamespace and n.nspname = pg_tables.schemaname
where schemaname in ('public', 'storage');

create or replace view public.v_policy_matrix as
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage');

create or replace view public.v_missing_recommended_indexes as
with required as (
  select 'public'::text as schema_name, 'exam_attempts'::text as table_name, 'idx_exam_attempts_created_at_desc'::text as index_name
  union all select 'public','exam_attempts','idx_exam_attempts_user_id_created_at_desc'
  union all select 'public','knowledge_base','idx_knowledge_base_active_created_at_desc'
  union all select 'public','admin_audit_logs','idx_admin_audit_logs_created_at_desc'
  union all select 'public','auth_activity_logs','idx_auth_activity_logs_created_at_desc'
)
select r.*
from required r
left join pg_indexes i
  on i.schemaname = r.schema_name
 and i.tablename = r.table_name
 and i.indexname = r.index_name
where i.indexname is null;

create or replace function public.admin_integrity_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing_indexes int;
  v_missing_rls int;
  v_admin_count int;
begin
  select count(*) into v_missing_indexes from public.v_missing_recommended_indexes;

  select count(*) into v_missing_rls
  from public.v_table_rls_status
  where schema_name = 'public'
    and table_name in ('exam_attempts', 'knowledge_base', 'admin_allowlist', 'admin_audit_logs', 'auth_activity_logs')
    and rls_enabled = false;

  select count(*) into v_admin_count
  from public.admin_allowlist
  where active = true;

  return jsonb_build_object(
    'missing_recommended_indexes', v_missing_indexes,
    'tables_without_rls', v_missing_rls,
    'active_allowlist_admins', v_admin_count,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.admin_integrity_report() from public;
grant execute on function public.admin_integrity_report() to authenticated, service_role;

commit;

