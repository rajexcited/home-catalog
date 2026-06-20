create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.users (id) on delete set null
);

create index if not exists item_images_item_id_idx on public.item_images (item_id);
create index if not exists item_images_owner_user_id_idx on public.item_images (owner_user_id);

alter table public.item_images enable row level security;

drop policy if exists "owners can read item_images" on public.item_images;
create policy "owners can read item_images"
on public.item_images
for select
using (auth.uid() = owner_user_id);

drop policy if exists "owners can insert item_images" on public.item_images;
create policy "owners can insert item_images"
on public.item_images
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "owners can delete item_images" on public.item_images;
create policy "owners can delete item_images"
on public.item_images
for delete
using (auth.uid() = owner_user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "owners can upload item images" on storage.objects;
create policy "owners can upload item images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "owners can update item images" on storage.objects;
create policy "owners can update item images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "owners can delete item images" on storage.objects;
create policy "owners can delete item images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
