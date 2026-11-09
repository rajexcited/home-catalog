-- Container names must be unique under the parent container (not per user).
-- Root containers (no parent) keep uniqueness per owner.

drop index if exists public.unique_container_name_per_user;

create unique index if not exists unique_container_name_under_parent on public.containers (parent_id, name) where parent_id is not null;
create unique index if not exists unique_root_container_name_per_user on public.containers (owner_user_id, name) where parent_id is null;
