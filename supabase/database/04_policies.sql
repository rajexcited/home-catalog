


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
