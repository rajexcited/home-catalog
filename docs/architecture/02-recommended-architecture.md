# Recommended Architecture Blueprint (Supabase + Vercel, Mobile-First)

## 1) High-Level Architecture

```mermaid
flowchart LR
  U[Family Users\nMobile Browser (Primary)] --> V[Vercel\nNext.js PWA]
  V --> AUTH[Supabase Auth\nInvite-only]
  V --> API[Supabase PostgREST / Edge Functions]
  API --> DB[(Postgres)]
  API --> ST[Object Storage\nSupabase Storage or R2]
  API --> RT[Realtime Channels]
  V --> C[Service Worker + Manifest\nOffline shell + install prompt]
```

## 1.1) MVP Device Targets
- Primary mobile targets: Pixel 9 Pro, iPhone 14 Pro, iPhone 15 Pro.
- Responsive scope for MVP: mobile-only layouts first.
- Tablet/desktop optimization is deferred until post-MVP.

## 2) Core Domain Model

### Main entities
- users
- containers (parent-child hierarchy)
- items
- container_members (sharing + role)
- item_photos
- audit_logs

### Suggested SQL tables

#### users
- id (uuid, pk)
- email (text, unique)
- display_name (text)
- created_at (timestamptz)

#### containers
- id (uuid, pk)
- parent_id (uuid, nullable, fk containers.id)
- owner_user_id (uuid, fk users.id)
- name (text)
- container_type (text)
- location (text)
- tags (text[])
- notes (text)
- path (text) -- materialized path for fast subtree filtering
- status (text check status in ('enabled','archived','removed'), default 'enabled')
- created_at, created_by
- updated_at, updated_by
- removed_at, removed_by, removed_reason

#### container_members
- container_id (uuid, fk containers.id)
- user_id (uuid, fk users.id)
- role (text: 'owner'|'manager'|'editor'|'viewer')
- invited_by (uuid)
- created_at
- primary key (container_id, user_id)

#### items
- id (uuid, pk)
- container_id (uuid, fk containers.id)
- owner_user_id (uuid, fk users.id)
- name (text)
- category (text)
- subcategory (text)
- location (text)
- tags (text[])
- notes (text)
- quantity (numeric)
- unit_cost (numeric)
- priority (text)
- serial_no (text)
- barcode (text)
- qr_code (text)
- purchase_date (date)
- warranty_expiry (date)
- status (text check status in ('enabled','archived','removed'), default 'enabled')
- product_mfg_company (text)
- product_seller (text)
- product_buyer (text)
- created_at, created_by
- updated_at, updated_by
- removed_at, removed_by, removed_reason

#### item_photos
- id (uuid, pk)
- item_id (uuid, fk items.id)
- storage_path (text)
- photo_type (text)
- display_order (int)
- caption (text)
- uploaded_by (uuid)
- created_at

#### audit_logs
- id (bigserial, pk)
- entity_type (text: 'container'|'item')
- entity_id (uuid)
- action (text: create/update/remove/share/unshare)
- changed_by (uuid)
- changed_at (timestamptz)
- ip_address (inet, nullable)
- user_agent (text, nullable)
- diff_json (jsonb)

## 3) Cost Computation
- Item total cost = quantity * unit_cost.
- Container computed cost = sum of all descendant item totals.
- Implement with recursive CTE query for on-demand calculation.
- If data grows, add a materialized summary table refreshed on item updates.

## 4) Search Model
- Search scope: only within selected parent container subtree.
- SQL strategy:
  - Store text search vector on name + tags + notes + serial_no + product_mfg_company + product_seller + barcode.
  - Use either recursive CTE or materialized path prefix filter to get descendant containers.
  - Filter items/containers by descendant IDs and tsquery.
- Add indexes:
  - items(container_id)
  - containers(parent_id)
  - containers(path)
  - items(serial_no)
  - items(barcode)
  - GIN(tags)
  - GIN(search_vector)

## 5) Access Control and Sharing Rules
- App is invite-only.
- Default sharing role for invited container member: editor (write).
- Manager role can invite members and adjust viewer/editor roles.
- Owner can downgrade member to viewer.
- User can read/write entities only if:
  - they own the container/item, or
  - they are member of an ancestor container with appropriate role.
- Enforce with Postgres RLS policies.

## 6) API Surface (Example)
- POST /containers
- GET /containers/:id
- POST /containers/:id/share
- POST /containers/:id/unshare
- POST /items
- PATCH /items/:id
- GET /containers/:id/search?q=...
- GET /containers/:id/cost-summary
- POST /items/:id/photos/presign
- GET /containers/:id/item-count
- GET /containers/:id/recent-items
- GET /containers/:id/activity
- GET /containers/:id/export

## 7) UI Strategy
- Build mobile-first responsive PWA on Next.js hosted on Vercel:
  - Installable on mobile home screen.
  - Optimized first for Pixel 9 Pro and iPhone 14/15 Pro viewport classes.
  - Offline shell + queued write drafts in Phase 2.
- Main screens:
  - Container tree + breadcrumb.
  - Item list with quick filters.
  - Item detail with photo gallery.
  - Share management.
  - Change history (audit timeline).
