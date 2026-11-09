-- Create the storage bucket for item images if it doesn't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;