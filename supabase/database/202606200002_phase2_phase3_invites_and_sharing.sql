-- Phase 2 + 3 DB changes
-- Invite-only membership + shareable container ACLs

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
  invited_by uuid not null references public.users (id) on delete restrict,
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
  shared_with_user_id uuid not null references public.users (id) on delete cascade,
  permission text not null check (permission in ('view', 'edit')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid not null references public.users (id) on delete restrict,
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

drop trigger if exists on_auth_user_signup_gate on auth.users;
create trigger on_auth_user_signup_gate
before insert on auth.users
for each row execute procedure public.ensure_invited_signup();

-- Ensure auth create trigger points to current handle_new_user implementation
-- (safe to re-run; this keeps order explicit)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists container_shares_set_updated_at on public.container_shares;
create trigger container_shares_set_updated_at
before update on public.container_shares
for each row execute procedure public.set_updated_at();

drop trigger if exists member_invites_set_updated_at on public.member_invites;
create trigger member_invites_set_updated_at
before update on public.member_invites
for each row execute procedure public.set_updated_at();

drop trigger if exists app_security_settings_set_updated_at on public.app_security_settings;
create trigger app_security_settings_set_updated_at
before update on public.app_security_settings
for each row execute procedure public.set_updated_at();

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

alter table public.container_shares enable row level security;
alter table public.member_invites enable row level security;
alter table public.app_security_settings enable row level security;

-- Shared container read permissions
-- Owner and admin already have access via existing policies; these add member share access.
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

-- Shared item access mirrors the parent container ACL
-- Editable members can update/insert but cannot delete.
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

-- Invite management: admin-only
-- (admin policies from phase 1 are already broad, these names keep intent explicit)
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

-- App security toggle: admin-only
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

-- Sharing ACL table policies
-- Select: owner/admin/reshare editor or direct recipient can inspect the row.
drop policy if exists "members can read container shares" on public.container_shares;
create policy "members can read container shares"
on public.container_shares
for select
using (
  shared_with_user_id = auth.uid()
  or public.can_reshare_container(auth.uid(), container_id)
  or public.is_admin(auth.uid())
);

-- Insert/Update/Delete: only owner/admin/reshare editor.
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
