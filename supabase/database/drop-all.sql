-- 1. Auth triggers created by the schema (auth.users rows are kept)
drop trigger if exists on_auth_user_signup_gate on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_deleted on auth.users;

-- 2. Storage: drop policies only. Objects and the bucket must be removed via the Storage API or dashboard (see notes).
drop policy if exists "owners can upload item images" on storage.objects;
drop policy if exists "owners can update item images" on storage.objects;
drop policy if exists "owners can delete item images" on storage.objects;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%item-images%' or coalesce(with_check, '') ilike '%item-images%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- 3. Views and tables in public (cascade removes their triggers, policies, and indexes)
do $$
declare r record;
begin
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- 4. Functions in public (skips functions owned by extensions)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;

-- 5. Enum and domain types, then standalone sequences, in public
do $$
declare r record;
begin
  for r in
    select t.typname from pg_type t
    where t.typnamespace = 'public'::regnamespace
      and t.typtype in ('e', 'd')
      and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
  for r in select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'S' loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;
end $$;

-- 6. Verify: expect 0 public tables, 0 item-images bucket, 0 app triggers on auth.users
select
  (select count(*) from pg_tables where schemaname = 'public') as public_tables,
  (select count(*) from storage.buckets where id = 'item-images') as item_images_bucket,
  (select count(*) from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal) as user_triggers_on_auth_users;