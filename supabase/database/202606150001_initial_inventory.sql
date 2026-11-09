create extension if not exists pgcrypto;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'deleted', 'banned')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.handle_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set status = 'deleted'
  where id = old.id;

  insert into public.audit_logs (user_id, action, entity_type, changes)
  values (
    old.id,
    'user is deleted',
    'user',
    jsonb_build_object(
      'email', old.email,
      'display_name', old.display_name,
      'old_status', old.status
    )
  );

  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
after delete on auth.users
for each row execute procedure public.handle_deleted_user();


create table public.containers (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  container_type uuid not null references public.container_types (id) on delete restrict,
  location text,
  tags text[] default '{}',
  notes text,
  unit_cost numeric,
  priority numeric,
  status text not null default 'enabled' check (status in ('enabled', 'archived', 'removed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null,
  status_changed_at timestamptz not null default timezone('utc'::text, now()),
  status_changed_by uuid references public.users (id) on delete set null,
  status_changed_reason text
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  category uuid references public.item_categories (id) on delete set restrict,
  subcategory text,
  location text,
  tags text[] default '{}',
  notes text,
  quantity numeric,
  unit_cost numeric,
  priority numeric,
  purchase_date date,
  status text not null default 'enabled' check (status in ('enabled', 'archived', 'removed')),
  item_attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null,
  status_changed_at timestamptz not null default timezone('utc'::text, now()),
  status_changed_by uuid references public.users (id) on delete set null,
  status_changed_reason text
);

create table public.container_types (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create table public.item_categories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create index if not exists containers_parent_id_idx on public.containers (parent_id);
create index if not exists containers_owner_user_id_idx on public.containers (owner_user_id);
create index if not exists containers_location_per_user_idx on public.containers (owner_user_id, location);
create index if not exists items_container_id_idx on public.items (container_id);
create index if not exists items_category_per_user_idx on public.items (owner_user_id, category);
create index if not exists items_owner_user_id_idx on public.items (owner_user_id);
create index if not exists container_types_owner_user_id_idx on public.container_types (owner_user_id);
create index if not exists item_categories_owner_user_id_idx on public.item_categories (owner_user_id);

create unique index if not exists unique_container_name_per_user on public.containers (owner_user_id, name);
create unique index if not exists unique_container_type_name_per_user on public.container_types (owner_user_id, name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.is_admin(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user_id
      and u.role = 'admin'
      and u.status = 'active'
  );
$$;

create or replace function public.audit_admin_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  payload jsonb;
  affected_entity_id uuid;
begin
  if actor_id is null or not public.is_admin(actor_id) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    payload := jsonb_build_object('new', to_jsonb(new));
    affected_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    affected_entity_id := new.id;
  else
    payload := jsonb_build_object('old', to_jsonb(old));
    affected_entity_id := old.id;
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, changes)
  values (
    actor_id,
    lower(tg_op) || ' by admin',
    tg_table_name,
    affected_entity_id,
    payload
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists containers_set_updated_at on public.containers;
create trigger containers_set_updated_at
before update on public.containers
for each row execute procedure public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute procedure public.set_updated_at();

drop trigger if exists container_types_set_updated_at on public.container_types;
create trigger container_types_set_updated_at
before update on public.container_types
for each row execute procedure public.set_updated_at();

drop trigger if exists item_categories_set_updated_at on public.item_categories;
create trigger item_categories_set_updated_at
before update on public.item_categories
for each row execute procedure public.set_updated_at();

drop trigger if exists users_admin_audit_trigger on public.users;
create trigger users_admin_audit_trigger
after insert or update or delete on public.users
for each row execute procedure public.audit_admin_action();

drop trigger if exists containers_admin_audit_trigger on public.containers;
create trigger containers_admin_audit_trigger
after insert or update or delete on public.containers
for each row execute procedure public.audit_admin_action();

drop trigger if exists items_admin_audit_trigger on public.items;
create trigger items_admin_audit_trigger
after insert or update or delete on public.items
for each row execute procedure public.audit_admin_action();

drop trigger if exists container_types_admin_audit_trigger on public.container_types;
create trigger container_types_admin_audit_trigger
after insert or update or delete on public.container_types
for each row execute procedure public.audit_admin_action();

drop trigger if exists item_categories_admin_audit_trigger on public.item_categories;
create trigger item_categories_admin_audit_trigger
after insert or update or delete on public.item_categories
for each row execute procedure public.audit_admin_action();


alter table public.audit_logs enable row level security;
alter table public.users enable row level security;
alter table public.containers enable row level security;
alter table public.items enable row level security;
alter table public.container_types enable row level security;
alter table public.item_categories enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users
for select
using (auth.uid() = id and status = 'active' and role = 'user');

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
on public.users
for update
using (auth.uid() = id and status = 'active' and role = 'user')
with check (auth.uid() = id and status = 'active' and role = 'user');

drop policy if exists "owners can read containers" on public.containers;
create policy "owners can read containers"
on public.containers
for select
using (auth.uid() = owner_user_id and status = 'enabled');

drop policy if exists "owners can insert containers" on public.containers;
create policy "owners can insert containers"
on public.containers
for insert
with check (auth.uid() = owner_user_id and status = 'enabled');

drop policy if exists "owners can update containers" on public.containers;
create policy "owners can update containers"
on public.containers
for update
using (auth.uid() = owner_user_id and status = 'enabled')
with check (auth.uid() = owner_user_id and status = 'enabled');

drop policy if exists "owners can delete containers" on public.containers;

drop policy if exists "owners can read items" on public.items;
create policy "owners can read items"
on public.items
for select
using (auth.uid() = owner_user_id and status = 'enabled');

drop policy if exists "owners can insert items" on public.items;
create policy "owners can insert items"
on public.items
for insert
with check (
  auth.uid() = owner_user_id
  and status = 'enabled'
  and exists (
    select 1
    from public.containers
    where containers.id = items.container_id
      and containers.owner_user_id = auth.uid()
  )
);

drop policy if exists "owners can update items" on public.items;
create policy "owners can update items"
on public.items
for update
using (auth.uid() = owner_user_id and status = 'enabled')
with check (auth.uid() = owner_user_id and status = 'enabled');

drop policy if exists "owners can read container types" on public.container_types;
create policy "owners can read container types"
on public.container_types
for select
using (auth.uid() = owner_user_id);

drop policy if exists "owners can insert container types" on public.container_types;
create policy "owners can insert container types"
on public.container_types
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can update container types" on public.container_types;
create policy "owners can update container types"
on public.container_types
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can read item categories" on public.item_categories;
create policy "owners can read item categories"
on public.item_categories
for select
using (auth.uid() = owner_user_id);

drop policy if exists "owners can insert item categories" on public.item_categories;
create policy "owners can insert item categories"
on public.item_categories
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can update item categories" on public.item_categories;
create policy "owners can update item categories"
on public.item_categories
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "admins can read users" on public.users;
create policy "admins can read users"
on public.users
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert users" on public.users;
create policy "admins can insert users"
on public.users
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update users" on public.users;
create policy "admins can update users"
on public.users
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete users" on public.users;
create policy "admins can delete users"
on public.users
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read containers" on public.containers;
create policy "admins can read containers"
on public.containers
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert containers" on public.containers;
create policy "admins can insert containers"
on public.containers
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update containers" on public.containers;
create policy "admins can update containers"
on public.containers
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete containers" on public.containers;
create policy "admins can delete containers"
on public.containers
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read items" on public.items;
create policy "admins can read items"
on public.items
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert items" on public.items;
create policy "admins can insert items"
on public.items
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update items" on public.items;
create policy "admins can update items"
on public.items
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete items" on public.items;
create policy "admins can delete items"
on public.items
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read container types" on public.container_types;
create policy "admins can read container types"
on public.container_types
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert container types" on public.container_types;
create policy "admins can insert container types"
on public.container_types
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update container types" on public.container_types;
create policy "admins can update container types"
on public.container_types
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete container types" on public.container_types;
create policy "admins can delete container types"
on public.container_types
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read item categories" on public.item_categories;
create policy "admins can read item categories"
on public.item_categories
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert item categories" on public.item_categories;
create policy "admins can insert item categories"
on public.item_categories
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update item categories" on public.item_categories;
create policy "admins can update item categories"
on public.item_categories
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete item categories" on public.item_categories;
create policy "admins can delete item categories"
on public.item_categories
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read audit logs" on public.audit_logs;
create policy "admins can read audit logs"
on public.audit_logs
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert audit logs" on public.audit_logs;
create policy "admins can insert audit logs"
on public.audit_logs
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update audit logs" on public.audit_logs;
create policy "admins can update audit logs"
on public.audit_logs
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete audit logs" on public.audit_logs;
create policy "admins can delete audit logs"
on public.audit_logs
for delete
using (public.is_admin(auth.uid()));
