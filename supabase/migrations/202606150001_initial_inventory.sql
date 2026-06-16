create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default timezone('utc'::text, now())
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

create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.containers (id) on delete set null,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  container_type text,
  location text,
  tags text[] default '{}',
  notes text,
  path text not null default '',
  status text not null default 'enabled' check (status in ('enabled', 'archived', 'removed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.users (id) on delete set null,
  removed_reason text
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  category text,
  subcategory text,
  location text,
  tags text[] default '{}',
  notes text,
  quantity numeric,
  unit_cost numeric,
  priority text,
  serial_no text,
  barcode text,
  qr_code text,
  purchase_date date,
  warranty_expiry date,
  status text not null default 'enabled' check (status in ('enabled', 'archived', 'removed')),
  product_mfg_company text,
  product_seller text,
  product_buyer text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.users (id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.users (id) on delete set null,
  removed_reason text
);

create index if not exists containers_parent_id_idx on public.containers (parent_id);
create index if not exists containers_path_idx on public.containers (path);
create index if not exists items_container_id_idx on public.items (container_id);
create index if not exists items_serial_no_idx on public.items (serial_no);
create index if not exists items_barcode_idx on public.items (barcode);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists containers_set_updated_at on public.containers;
create trigger containers_set_updated_at
before update on public.containers
for each row execute procedure public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.containers enable row level security;
alter table public.items enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "owners can read containers" on public.containers;
create policy "owners can read containers"
on public.containers
for select
using (auth.uid() = owner_user_id);

drop policy if exists "owners can insert containers" on public.containers;
create policy "owners can insert containers"
on public.containers
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can update containers" on public.containers;
create policy "owners can update containers"
on public.containers
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can delete containers" on public.containers;
create policy "owners can delete containers"
on public.containers
for delete
using (auth.uid() = owner_user_id);

drop policy if exists "owners can read items" on public.items;
create policy "owners can read items"
on public.items
for select
using (auth.uid() = owner_user_id);

drop policy if exists "owners can insert items" on public.items;
create policy "owners can insert items"
on public.items
for insert
with check (
  auth.uid() = owner_user_id
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
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can delete items" on public.items;
create policy "owners can delete items"
on public.items
for delete
using (auth.uid() = owner_user_id);