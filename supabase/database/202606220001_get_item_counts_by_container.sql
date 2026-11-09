-- Returns the count of enabled items per container for the given list of container IDs.
-- Safe to call with an empty array; returns an empty result set.
create or replace function public.get_item_counts_by_container(
  container_ids uuid[] default '{}',
  status_filters text[] default array['enabled']::text[]
)
returns table (
  container_id uuid,
  item_count   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.container_id,
    count(*) as item_count
  from public.items i
  where i.container_id = any(container_ids)
    and i.status = any(status_filters)
  group by i.container_id;
$$;
