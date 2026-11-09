-- finalize-v1 baseline for a fresh production database.
-- Consolidates 01_tables_indexes, 02_triggers_functions, 03_storage, 04_policies and
-- 05_manually_backfill_existing_users, and includes the changes from the timestamped
-- migrations 202606150001 through 202610300001.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- No foreign key to auth.users: deleting an auth user soft-deletes the profile
-- (see handle_deleted_user) so audit history keeps a valid reference.
create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'deleted', 'banned')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.container_types (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create table if not exists public.item_categories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  container_type uuid not null references public.container_types (id) on delete restrict,
  location text,
  tags text[] default '{}',
  notes text default '',
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

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  category uuid references public.item_categories (id) on delete restrict,
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

create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  storage_path text not null,
  caption text,
  status text not null default 'enabled' check (status in ('enabled', 'archived', 'removed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create table if not exists public.app_security_settings (
  id boolean primary key default true,
  allow_password_signups boolean not null default false,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null,
  check (id)
);

insert into public.app_security_settings (id, allow_password_signups)
values (true, false)
on conflict (id) do nothing;

create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid not null references public.users (id) on delete cascade,
  role_to_assign text not null default 'user' check (role_to_assign in ('user', 'admin')),
  allowed_providers text[] not null default array['google', 'facebook'],
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.container_shares (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  shared_with_user_id uuid not null references public.users (id) on delete cascade,
  permission text not null check (permission in ('view', 'edit')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists container_types_owner_user_id_idx on public.container_types (owner_user_id);
create unique index if not exists unique_container_type_name_per_user on public.container_types (owner_user_id, name);

create index if not exists item_categories_owner_user_id_idx on public.item_categories (owner_user_id);
create unique index if not exists unique_item_category_name_per_user on public.item_categories (owner_user_id, name);

create index if not exists containers_parent_id_idx on public.containers (parent_id);
create index if not exists containers_owner_user_id_idx on public.containers (owner_user_id);
create index if not exists containers_location_per_user_idx on public.containers (owner_user_id, location);
create unique index if not exists unique_container_name_under_parent on public.containers (parent_id, name) where parent_id is not null;
create unique index if not exists unique_root_container_name_per_user on public.containers (owner_user_id, name) where parent_id is null;

create index if not exists items_container_id_idx on public.items (container_id);
create index if not exists items_category_per_user_idx on public.items (owner_user_id, category);
create index if not exists items_owner_user_id_idx on public.items (owner_user_id);

create index if not exists item_images_item_id_idx on public.item_images (item_id);
create index if not exists item_images_owner_user_id_idx on public.item_images (owner_user_id);

create unique index if not exists member_invites_pending_email_unique_idx
on public.member_invites (lower(email))
where status = 'pending';
create index if not exists member_invites_invited_by_idx on public.member_invites (invited_by);
create index if not exists member_invites_status_idx on public.member_invites (status);

create unique index if not exists container_shares_active_unique_idx
on public.container_shares (container_id, shared_with_user_id)
where status = 'active';
create index if not exists container_shares_container_id_idx on public.container_shares (container_id);
create index if not exists container_shares_shared_with_user_id_idx on public.container_shares (shared_with_user_id);
create index if not exists container_shares_status_idx on public.container_shares (status);

-- -----------------------------------------------------------------------------
-- Functions and triggers
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.member_invites%rowtype;
  assigned_role text := 'user';
  bootstrap_admin_mode boolean;
begin
  select not exists (
    select 1
    from public.users u
    where u.role = 'admin'
      and u.status = 'active'
  )
  into bootstrap_admin_mode;

  select *
  into invite_row
  from public.member_invites mi
  where lower(mi.email) = lower(coalesce(new.email, ''))
    and mi.status = 'pending'
    and (mi.expires_at is null or mi.expires_at > timezone('utc'::text, now()))
  order by mi.created_at desc
  limit 1;

  if bootstrap_admin_mode then
    assigned_role := 'admin';
  elsif invite_row.id is not null then
    assigned_role := invite_row.role_to_assign;
  end if;

  insert into public.users (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    assigned_role
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name;

  if invite_row.id is not null then
    update public.member_invites
    set status = 'accepted',
        accepted_at = timezone('utc'::text, now()),
        accepted_user_id = new.id,
        updated_at = timezone('utc'::text, now())
    where id = invite_row.id;

    insert into public.audit_logs (user_id, action, entity_type, entity_id, changes)
    values (
      new.id,
      'invite accepted',
      'member_invites',
      invite_row.id,
      jsonb_build_object('email', coalesce(new.email, ''), 'role_assigned', assigned_role)
    );
  end if;

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

create or replace function public.set_audit_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists users_set_audit_updated on public.users;
create trigger users_set_audit_updated
before update on public.users
for each row execute procedure public.set_audit_updated();

drop trigger if exists container_types_set_audit_updated on public.container_types;
create trigger container_types_set_audit_updated
before update on public.container_types
for each row execute procedure public.set_audit_updated();

drop trigger if exists item_categories_set_audit_updated on public.item_categories;
create trigger item_categories_set_audit_updated
before update on public.item_categories
for each row execute procedure public.set_audit_updated();

drop trigger if exists containers_set_audit_updated on public.containers;
create trigger containers_set_audit_updated
before update on public.containers
for each row execute procedure public.set_audit_updated();

drop trigger if exists items_set_audit_updated on public.items;
create trigger items_set_audit_updated
before update on public.items
for each row execute procedure public.set_audit_updated();

drop trigger if exists item_images_set_audit_updated on public.item_images;
create trigger item_images_set_audit_updated
before update on public.item_images
for each row execute procedure public.set_audit_updated();

drop trigger if exists container_shares_set_audit_updated on public.container_shares;
create trigger container_shares_set_audit_updated
before update on public.container_shares
for each row execute procedure public.set_audit_updated();

drop trigger if exists member_invites_set_audit_updated on public.member_invites;
create trigger member_invites_set_audit_updated
before update on public.member_invites
for each row execute procedure public.set_audit_updated();

drop trigger if exists app_security_settings_set_audit_updated on public.app_security_settings;
create trigger app_security_settings_set_audit_updated
before update on public.app_security_settings
for each row execute procedure public.set_audit_updated();

create or replace function public.set_audit_created()
returns trigger
language plpgsql
as $$
begin
  new.created_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists containers_set_audit_created on public.containers;
create trigger containers_set_audit_created
before insert on public.containers
for each row execute procedure public.set_audit_created();

drop trigger if exists items_set_audit_created on public.items;
create trigger items_set_audit_created
before insert on public.items
for each row execute procedure public.set_audit_created();

drop trigger if exists container_types_set_audit_created on public.container_types;
create trigger container_types_set_audit_created
before insert on public.container_types
for each row execute procedure public.set_audit_created();

drop trigger if exists item_categories_set_audit_created on public.item_categories;
create trigger item_categories_set_audit_created
before insert on public.item_categories
for each row execute procedure public.set_audit_created();

drop trigger if exists container_shares_set_audit_created on public.container_shares;
create trigger container_shares_set_audit_created
before insert on public.container_shares
for each row execute procedure public.set_audit_created();

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
  msg text := '';
  msg_op text := '';
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
    msg_op := 'created';
  elsif tg_op = 'UPDATE' then
    payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    affected_entity_id := new.id;
    if to_jsonb(new) ? 'status' then
      if new.status != old.status then
        msg_op := 'for status changed from ' || old.status || ' to ' || new.status;
      else
        msg_op := 'updated';
      end if;
    end if;
  else
    payload := jsonb_build_object('old', to_jsonb(old));
    affected_entity_id := old.id;
    msg_op := 'deleted';
  end if;

  if tg_table_name = 'users' then
    msg := 'user ' || msg_op;
  elsif tg_table_name = 'containers' then
    msg := 'container ' || msg_op;
  elsif tg_table_name = 'items' then
    msg := 'item ' || msg_op;
  elsif tg_table_name = 'container_types' then
    msg := 'container type ' || msg_op;
  elsif tg_table_name = 'item_categories' then
    msg := 'item category ' || msg_op;
  elsif tg_table_name = 'member_invites' then
    msg := 'member invitation ' || msg_op;
  elsif tg_table_name = 'app_security_settings' then
    msg := 'app security settings ' || msg_op;
  elsif tg_table_name = 'container_shares' then
    if tg_op = 'INSERT' then
      msg := 'container shared with user granted';
    elsif tg_op = 'UPDATE' then
      msg := 'container shared with user ' || msg_op;
    elsif tg_op = 'DELETE' then
      msg := 'container shared with user revoked';
    end if;
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, changes)
  values (
    actor_id,
    msg || ' by admin',
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

drop trigger if exists container_shares_admin_audit_trigger on public.container_shares;
create trigger container_shares_admin_audit_trigger
after insert or update or delete on public.container_shares
for each row execute procedure public.audit_admin_action();

drop trigger if exists member_invites_admin_audit_trigger on public.member_invites;
create trigger member_invites_admin_audit_trigger
after insert or update or delete on public.member_invites
for each row execute procedure public.audit_admin_action();

drop trigger if exists app_security_settings_admin_audit_trigger on public.app_security_settings;
create trigger app_security_settings_admin_audit_trigger
after insert or update or delete on public.app_security_settings
for each row execute procedure public.audit_admin_action();

create or replace function public.user_can_view_container(target_user_id uuid, target_container_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if target_user_id is null or target_container_id is null then
    return false;
  end if;

  if public.is_admin(target_user_id) then
    return true;
  end if;

  select exists (
    select 1
    from public.containers c
    where c.id = target_container_id
      and c.owner_user_id = target_user_id
  )
  into allowed;

  if allowed then
    return true;
  end if;

  with recursive ancestors as (
    select c.id, c.parent_id
    from public.containers c
    where c.id = target_container_id

    union all

    select p.id, p.parent_id
    from public.containers p
    join ancestors a on a.parent_id = p.id
  )
  select exists (
    select 1
    from ancestors a
    join public.container_shares s on s.container_id = a.id
    where s.shared_with_user_id = target_user_id
      and s.status = 'active'
      and s.permission in ('view', 'edit')
  )
  into allowed;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.user_can_edit_container(target_user_id uuid, target_container_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if target_user_id is null or target_container_id is null then
    return false;
  end if;

  if public.is_admin(target_user_id) then
    return true;
  end if;

  select exists (
    select 1
    from public.containers c
    where c.id = target_container_id
      and c.owner_user_id = target_user_id
  )
  into allowed;

  if allowed then
    return true;
  end if;

  with recursive ancestors as (
    select c.id, c.parent_id
    from public.containers c
    where c.id = target_container_id

    union all

    select p.id, p.parent_id
    from public.containers p
    join ancestors a on a.parent_id = p.id
  )
  select exists (
    select 1
    from ancestors a
    join public.container_shares s on s.container_id = a.id
    where s.shared_with_user_id = target_user_id
      and s.status = 'active'
      and s.permission = 'edit'
  )
  into allowed;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.can_reshare_container(target_user_id uuid, target_container_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if target_user_id is null or target_container_id is null then
    return false;
  end if;

  if public.is_admin(target_user_id) then
    return true;
  end if;

  select exists (
    select 1
    from public.containers c
    where c.id = target_container_id
      and c.owner_user_id = target_user_id
  )
  into allowed;

  if allowed then
    return true;
  end if;

  with recursive ancestors as (
    select c.id, c.parent_id
    from public.containers c
    where c.id = target_container_id

    union all

    select p.id, p.parent_id
    from public.containers p
    join ancestors a on a.parent_id = p.id
  )
  select exists (
    select 1
    from ancestors a
    join public.container_shares s on s.container_id = a.id
    where s.shared_with_user_id = target_user_id
      and s.status = 'active'
      and s.permission = 'edit'
  )
  into allowed;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.ensure_invited_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.member_invites%rowtype;
  provider text;
  allow_password boolean;
  bootstrap_admin_mode boolean;
begin
  select not exists (
    select 1
    from public.users u
    where u.role = 'admin'
      and u.status = 'active'
  )
  into bootstrap_admin_mode;

  select *
  into invite_row
  from public.member_invites mi
  where lower(mi.email) = lower(coalesce(new.email, ''))
    and mi.status = 'pending'
    and (mi.expires_at is null or mi.expires_at > timezone('utc'::text, now()))
  order by mi.created_at desc
  limit 1;

  if not bootstrap_admin_mode and invite_row.id is null then
    raise exception 'Signup is disabled. You must be invited by an admin.';
  end if;

  provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');

  if not bootstrap_admin_mode then
    select ass.allow_password_signups
    into allow_password
    from public.app_security_settings ass
    where ass.id = true;

    if provider = 'email' and not coalesce(allow_password, false) then
      raise exception 'Password signup is disabled. Use invited OAuth sign-in.';
    end if;

    if invite_row.allowed_providers is not null
       and array_length(invite_row.allowed_providers, 1) is not null
       and not (provider = any(invite_row.allowed_providers)) then
      raise exception 'Provider % is not allowed for this invite.', provider;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_signup_gate on auth.users;
create trigger on_auth_user_signup_gate
before insert on auth.users
for each row execute procedure public.ensure_invited_signup();

-- Returns all container IDs visible to a given user:
-- owned containers + directly-shared containers + all their enabled descendants.
create or replace function public.get_visible_container_ids(p_user_id uuid, status_filters text[] default array['enabled'], range_start int default 0, range_end int default 2147483647)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with recursive visible as (
    select c.id
    from public.containers c
    where c.owner_user_id = p_user_id
      and c.status = any(status_filters)

    union

    select cs.container_id as id
    from public.container_shares cs
    where cs.shared_with_user_id = p_user_id
      and cs.status = 'active'

    union all

    select c.id
    from public.containers c
    join visible v on c.parent_id = v.id
    where c.status = any(status_filters)
  )
  select distinct id from visible
  order by id
  offset range_start
  limit range_end - range_start;
$$;

-- Returns the top-most containers visible to the user: containers that are in the
-- visible set but whose parent is either null or outside the visible set.
create or replace function public.get_visible_container_roots(
  p_user_id uuid,
  status_filters text[] default array['enabled']
)
returns table (
  id         uuid,
  name       text,
  status     text
)
language sql
stable
security definer
set search_path = public
as $$
  with visible as (
    select v.id
    from public.get_visible_container_ids(p_user_id, status_filters, 0, 2147483647) v
  )
  select
    c.id,
    c.name,
    c.status
  from public.containers c
  join visible v          on v.id = c.id
  left join visible vp    on vp.id = c.parent_id
  where c.parent_id is null
     or vp.id is null
  order by c.name;
$$;

-- Returns the enabled item count and item IDs per container for the given container IDs.
-- Safe to call with an empty array; returns an empty result set.
create or replace function public.get_item_counts_by_container(
  container_ids uuid[] default '{}',
  status_filters text[] default array['enabled']::text[]
)
returns table (
  container_id uuid,
  item_count   bigint,
  child_item_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.container_id,
    count(*) as item_count,
    array_agg(i.id) as child_item_ids
  from public.items i
  where i.container_id = any(container_ids)
    and i.status = any(status_filters)
  group by i.container_id;
$$;

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------

alter table public.audit_logs enable row level security;
alter table public.users enable row level security;
alter table public.containers enable row level security;
alter table public.items enable row level security;
alter table public.container_types enable row level security;
alter table public.item_categories enable row level security;
alter table public.item_images enable row level security;
alter table public.container_shares enable row level security;
alter table public.member_invites enable row level security;
alter table public.app_security_settings enable row level security;

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

drop policy if exists "owners can read item_images" on public.item_images;
create policy "owners can read item_images"
on public.item_images
for select
using (auth.uid() = owner_user_id);

drop policy if exists "shared editors can read item_images" on public.item_images;
create policy "shared editors can read item_images"
on public.item_images
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.items i
    where i.id = item_images.item_id
      and public.user_can_edit_container(auth.uid(), i.container_id)
  )
);

drop policy if exists "owners can insert item_images" on public.item_images;
create policy "owners can insert item_images"
on public.item_images
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "shared editors can insert item_images" on public.item_images;
create policy "shared editors can insert item_images"
on public.item_images
for insert
with check (
  public.is_admin(auth.uid())
  or (
    auth.uid() = owner_user_id
    and exists (
      select 1
      from public.items i
      where i.id = item_images.item_id
        and public.user_can_edit_container(auth.uid(), i.container_id)
    )
  )
);

drop policy if exists "shared editors can update item_images" on public.item_images;
create policy "shared editors can update item_images"
on public.item_images
for update
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.items i
    where i.id = item_images.item_id
      and public.user_can_edit_container(auth.uid(), i.container_id)
  )
)
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.items i
    where i.id = item_images.item_id
      and public.user_can_edit_container(auth.uid(), i.container_id)
  )
);

drop policy if exists "owners can delete item_images" on public.item_images;
create policy "owners can delete item_images"
on public.item_images
for delete
using (auth.uid() = owner_user_id);

drop policy if exists "shared editors can delete item_images" on public.item_images;
create policy "shared editors can delete item_images"
on public.item_images
for delete
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.items i
    where i.id = item_images.item_id
      and public.user_can_edit_container(auth.uid(), i.container_id)
  )
);

drop policy if exists "owners can upload item images" on storage.objects;
create policy "owners can upload item images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-images'
  and (
    public.is_admin(auth.uid())
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and exists (
        select 1
        from public.items i
        where i.id = ((storage.foldername(name))[2])::uuid
          and public.user_can_edit_container(auth.uid(), i.container_id)
      )
    )
  )
);

drop policy if exists "owners can update item images" on storage.objects;
create policy "owners can update item images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'item-images'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.item_images ii
      join public.items i on i.id = ii.item_id
      where ii.storage_path = name
        and public.user_can_edit_container(auth.uid(), i.container_id)
    )
  )
)
with check (
  bucket_id = 'item-images'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.item_images ii
      join public.items i on i.id = ii.item_id
      where ii.storage_path = name
        and public.user_can_edit_container(auth.uid(), i.container_id)
    )
  )
);

drop policy if exists "owners can delete item images" on storage.objects;
create policy "owners can delete item images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-images'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.item_images ii
      join public.items i on i.id = ii.item_id
      where ii.storage_path = name
        and public.user_can_edit_container(auth.uid(), i.container_id)
    )
  )
);

drop policy if exists "shared members can read containers" on public.containers;
create policy "shared members can read containers"
on public.containers
for select
using (public.user_can_view_container(auth.uid(), id) and status = 'enabled');

drop policy if exists "shared editors can update containers" on public.containers;
create policy "shared editors can update containers"
on public.containers
for update
using (public.user_can_edit_container(auth.uid(), id) and status = 'enabled')
with check (
  public.user_can_edit_container(auth.uid(), id)
  and status in ('enabled', 'archived')
);

-- Shared items mirror the parent container ACL; editors can insert/update but not delete.
drop policy if exists "shared members can read items" on public.items;
create policy "shared members can read items"
on public.items
for select
using (
  status = 'enabled'
  and public.user_can_view_container(auth.uid(), container_id)
);

drop policy if exists "shared editors can insert items" on public.items;
create policy "shared editors can insert items"
on public.items
for insert
with check (
  status in ('enabled', 'archived')
  and public.user_can_edit_container(auth.uid(), container_id)
);

drop policy if exists "shared editors can update items" on public.items;
create policy "shared editors can update items"
on public.items
for update
using (public.user_can_edit_container(auth.uid(), container_id))
with check (
  public.user_can_edit_container(auth.uid(), container_id)
  and status in ('enabled', 'archived')
);

drop policy if exists "admins can read member invites" on public.member_invites;
create policy "admins can read member invites"
on public.member_invites
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert member invites" on public.member_invites;
create policy "admins can insert member invites"
on public.member_invites
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update member invites" on public.member_invites;
create policy "admins can update member invites"
on public.member_invites
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete member invites" on public.member_invites;
create policy "admins can delete member invites"
on public.member_invites
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read app security settings" on public.app_security_settings;
create policy "admins can read app security settings"
on public.app_security_settings
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert app security settings" on public.app_security_settings;
create policy "admins can insert app security settings"
on public.app_security_settings
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can update app security settings" on public.app_security_settings;
create policy "admins can update app security settings"
on public.app_security_settings
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins can delete app security settings" on public.app_security_settings;
create policy "admins can delete app security settings"
on public.app_security_settings
for delete
using (public.is_admin(auth.uid()));

drop policy if exists "members can read container shares" on public.container_shares;
create policy "members can read container shares"
on public.container_shares
for select
using (
  shared_with_user_id = auth.uid()
  or public.can_reshare_container(auth.uid(), container_id)
  or public.is_admin(auth.uid())
);

drop policy if exists "authorized users can insert container shares" on public.container_shares;
create policy "authorized users can insert container shares"
on public.container_shares
for insert
with check (
  public.can_reshare_container(auth.uid(), container_id)
  or public.is_admin(auth.uid())
);

drop policy if exists "authorized users can update container shares" on public.container_shares;
create policy "authorized users can update container shares"
on public.container_shares
for update
using (
  public.can_reshare_container(auth.uid(), container_id)
  or public.is_admin(auth.uid())
)
with check (
  public.can_reshare_container(auth.uid(), container_id)
  or public.is_admin(auth.uid())
);

drop policy if exists "authorized users can delete container shares" on public.container_shares;
create policy "authorized users can delete container shares"
on public.container_shares
for delete
using (
  public.can_reshare_container(auth.uid(), container_id)
  or public.is_admin(auth.uid())
);

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Backfill profiles for auth users created before the signup trigger existed
-- -----------------------------------------------------------------------------

insert into public.users (id, email, display_name)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(au.raw_user_meta_data ->> 'display_name', split_part(coalesce(au.email, ''), '@', 1))
from auth.users au
where not exists (
  select 1 from public.users pu where pu.id = au.id or pu.email = au.email
)
on conflict (id) do nothing;
