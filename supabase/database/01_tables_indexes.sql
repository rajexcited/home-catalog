create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete set null,
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
  owner_user_id uuid not null references public.users (id) on delete set null,
  name text not null check (btrim(name) <> ''),
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);
create index if not exists container_types_owner_user_id_idx on public.container_types (owner_user_id);
create unique index if not exists unique_container_type_name_per_user on public.container_types (owner_user_id, name);

create table if not exists public.item_categories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);
create index if not exists item_categories_owner_user_id_idx on public.item_categories (owner_user_id);
create unique index if not exists unique_item_category_name_per_user on public.item_categories (owner_user_id, name);


create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete set null,
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
create index if not exists containers_parent_id_idx on public.containers (parent_id);
create index if not exists containers_owner_user_id_idx on public.containers (owner_user_id);
create index if not exists containers_location_per_user_idx on public.containers (owner_user_id, location);
create unique index if not exists unique_container_name_under_parent on public.containers (parent_id, name) where parent_id is not null;
create unique index if not exists unique_root_container_name_per_user on public.containers (owner_user_id, name) where parent_id is null;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete set null,
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
create index if not exists items_container_id_idx on public.items (container_id);
create index if not exists items_category_per_user_idx on public.items (owner_user_id, category);
create index if not exists items_owner_user_id_idx on public.items (owner_user_id);

create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete set null,
  storage_path text not null,
  caption text,
  status text not null default 'enabled' check (status in ('enabled', 'archived', 'removed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create index if not exists item_images_item_id_idx on public.item_images (item_id);
create index if not exists item_images_owner_user_id_idx on public.item_images (owner_user_id);

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
  invited_by uuid not null references public.users (id) on delete set null,
  role_to_assign text not null default 'user' check (role_to_assign in ('user', 'admin')),
  allowed_providers text[] not null default array['google', 'facebook'],
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists member_invites_pending_email_unique_idx
on public.member_invites (lower(email))
where status = 'pending';

create index if not exists member_invites_invited_by_idx on public.member_invites (invited_by);
create index if not exists member_invites_status_idx on public.member_invites (status);


create table if not exists public.container_shares (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  shared_with_user_id uuid not null references public.users (id) on delete set null,
  permission text not null check (permission in ('view', 'edit')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid not null references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null
);

create unique index if not exists container_shares_active_unique_idx
on public.container_shares (container_id, shared_with_user_id)
where status = 'active';

create index if not exists container_shares_container_id_idx on public.container_shares (container_id);
create index if not exists container_shares_shared_with_user_id_idx on public.container_shares (shared_with_user_id);
create index if not exists container_shares_status_idx on public.container_shares (status);

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
