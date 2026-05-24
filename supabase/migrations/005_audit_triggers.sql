-- 005_audit_triggers.sql
-- Purpose: table-level mutation auditing for critical admin datasets.

begin;

create schema if not exists shauri_private;

create or replace function shauri_private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_id text;
  v_action text;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_target_id := coalesce((to_jsonb(new)->>'id'), '');
    v_action := lower(tg_table_name) || '_insert';
    v_payload := jsonb_build_object('new', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    v_target_id := coalesce((to_jsonb(new)->>'id'), '');
    v_action := lower(tg_table_name) || '_update';
    v_payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_target_id := coalesce((to_jsonb(old)->>'id'), '');
    v_action := lower(tg_table_name) || '_delete';
    v_payload := jsonb_build_object('old', to_jsonb(old));
  end if;

  if public.is_admin_user(auth.uid()) then
    perform public.log_admin_action(v_action, tg_table_name, v_target_id, v_payload);
  end if;

  return coalesce(new, old);
end;
$$;

do $$
begin
  if to_regclass('public.exam_attempts') is not null then
    if not exists (select 1 from pg_trigger where tgname = 'trg_exam_attempts_audit') then
      create trigger trg_exam_attempts_audit
      after insert or update or delete on public.exam_attempts
      for each row execute function shauri_private.audit_row_change();
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.knowledge_base') is not null then
    if not exists (select 1 from pg_trigger where tgname = 'trg_knowledge_base_audit') then
      create trigger trg_knowledge_base_audit
      after insert or update or delete on public.knowledge_base
      for each row execute function shauri_private.audit_row_change();
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_allowlist') is not null then
    if not exists (select 1 from pg_trigger where tgname = 'trg_admin_allowlist_audit') then
      create trigger trg_admin_allowlist_audit
      after insert or update or delete on public.admin_allowlist
      for each row execute function shauri_private.audit_row_change();
    end if;
  end if;
end $$;

commit;
