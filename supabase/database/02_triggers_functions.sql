-------------------------------------------------------------------------------------


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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------------

-- Returns all container IDs visible to a given user:
-- owned containers + directly-shared containers + all their enabled descendants.
-- Uses a recursive CTE so the entire traversal is one SQL query.
create or replace function public.get_visible_container_ids(p_user_id uuid, status_filters text[] default array['enabled'], range_start int default 0, range_end int default 2147483647)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with recursive visible as (
    -- containers owned by the user
    select c.id
    from public.containers c
    where c.owner_user_id = p_user_id
      and c.status = any(status_filters)

    union

    -- containers directly shared with the user
    select cs.container_id as id
    from public.container_shares cs
    where cs.shared_with_user_id = p_user_id
      and cs.status = 'active'

    union all

    -- recursive: enabled children of any already-visible container
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
-- This handles shared containers whose ancestor is not visible to the user.
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

-- Returns the count of enabled items per container for the given list of container IDs.
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
