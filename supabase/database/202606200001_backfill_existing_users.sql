-- Back-fill public.users for every auth user that exists but has no profile row.
-- This is needed when accounts were created before the handle_new_user trigger
-- was applied, or when the trigger was dropped and re-created after sign-up.

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
