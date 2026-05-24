-- 006_storage_security.sql
-- Purpose: secure storage bucket and object policies for admin-managed knowledge files.
-- Bucket: admin-kb

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-kb',
  'admin-kb',
  false,
  20971520,
  array[
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function shauri_private.is_allowed_admin_kb_mime(p_mime text)
returns boolean
language sql
stable
as $$
  select p_mime = any(array[
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]);
$$;

alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polname = 'admin_kb_select_admin_only'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy admin_kb_select_admin_only
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'admin-kb' and public.is_admin_user(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policy
    where polname = 'admin_kb_insert_admin_only'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy admin_kb_insert_admin_only
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'admin-kb'
      and public.is_admin_user(auth.uid())
      and owner = auth.uid()
      and shauri_private.is_allowed_admin_kb_mime((metadata->>'mimetype'))
    );
  end if;

  if not exists (
    select 1 from pg_policy
    where polname = 'admin_kb_update_admin_only'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy admin_kb_update_admin_only
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'admin-kb' and public.is_admin_user(auth.uid()))
    with check (
      bucket_id = 'admin-kb'
      and public.is_admin_user(auth.uid())
      and shauri_private.is_allowed_admin_kb_mime((metadata->>'mimetype'))
    );
  end if;

  if not exists (
    select 1 from pg_policy
    where polname = 'admin_kb_delete_admin_only'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy admin_kb_delete_admin_only
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'admin-kb' and public.is_admin_user(auth.uid()));
  end if;
end $$;

commit;

