I like **"Home Catalog"**. It's simple, memorable, and clearly communicates the purpose without limiting future expansion. It works equally well for homes, garages, storage units, offices, RVs, workshops, or collections.

## Overall Architecture Review

Your design is already much stronger than most inventory apps. The hierarchy + sharing + audit trail is a solid foundation.

I'd make the following improvements before writing code.

---

# 1. Domain Model Improvements

## Add `container_type`

Containers will likely represent different things:

- Home
- Floor
- Room
- Closet
- Cabinet
- Shelf
- Box
- Drawer
- Storage Bin

Instead of putting everything in `name`, add:

```sql
container_type text
```

Example:

| Name           | Type   |
| -------------- | ------ |
| Master Bedroom | room   |
| Closet A       | closet |
| Shelf 2        | shelf  |
| Blue Bin       | bin    |

This enables better filtering and icons.

---

## Add Item Categories

Instead of only tags:

```sql
category text
subcategory text
```

Examples:

| Category    | Subcategory |
| ----------- | ----------- |
| Electronics | Networking  |
| Tools       | Power Tools |
| Documents   | Tax         |
| Kitchen     | Appliances  |

Makes reporting easier.

---

## Add Warranty & Purchase Information

Most people eventually want:

```sql
purchase_date date
warranty_expiry date
```

Useful future features:

- warranty alerts
- insurance reports
- home inventory exports

---

## Add Barcode / QR Support

```sql
barcode text
qr_code text
```

Later:

- scan item
- locate item instantly

---

## Add Soft Delete Status Enum

Instead of:

```sql
status text
```

Use:

```sql
status text check (
 status in ('enabled','archived','removed')
)
```

---

# 2. Container Hierarchy

Your parent-child model is good.

Example:

```text
Home
 ├─ Garage
 │   ├─ Shelf A
 │   ├─ Shelf B
 │
 ├─ Kitchen
 │   ├─ Pantry
 │
 ├─ Master Bedroom
 │   ├─ Closet
 │       ├─ Drawer 1
```

No changes needed.

---

# 3. Add Materialized Path

Recursive CTEs work.

But after thousands of containers, they become expensive.

Add:

```sql
path text
```

Example:

```text
/home
/home/garage
/home/garage/shelf-a
```

or

```text
1.5.12.18
```

Benefits:

```sql
WHERE path LIKE '1.5.%'
```

Very fast subtree searches.

---

# 4. Photos

Current:

```sql
item_photos
```

I'd expand:

```sql
photo_type
display_order
caption
```

Example:

```sql
front
receipt
manual
serial-label
```

Users often upload:

- item photo
- receipt photo
- warranty photo

---

# 5. Audit Log

Current design is excellent.

I'd add:

```sql
ip_address
user_agent
```

Optional.

Useful for security and troubleshooting.

---

# 6. Search Improvements

Current design:

```text
name
tags
notes
```

Good start.

I'd include:

```sql
serial_no
product_mfg_company
product_seller
barcode
```

in the search vector.

Users frequently search:

```text
where is my Netgear switch
where is receipt from Costco
where is serial number X
```

---

# 7. Sharing Model

I would slightly change defaults.

Current:

```text
viewer
editor
owner
```

Recommended:

```text
viewer
editor
manager
owner
```

Manager can:

- invite members
- manage permissions

But cannot:

- transfer ownership
- delete root container

Very useful for family scenarios.

---

# 8. Release-Ready Reporting Features

Add API now.

```http
GET /containers/:id/item-count
GET /containers/:id/recent-items
GET /containers/:id/activity
GET /containers/:id/export
```

Future proof.

---

# PWA UX Design Samples

## Option A — Consumer Friendly

Best for families.

### Home Screen

```text
┌─────────────────────┐
│ Home Catalog        │
├─────────────────────┤
│ 🔍 Search           │
├─────────────────────┤
│ 📦 Containers       │
│ 🏷️ Categories       │
│ ⭐ Favorites         │
│ 🕒 Recent Activity  │
└─────────────────────┘
```

### Container View

```text
Garage
────────────────

📦 Shelf A
📦 Shelf B
📦 Tool Cabinet

Items: 128
Value: $4,210
```

---

## Option B — Visual First

Best for non-technical users.

### Home

```text
┌─────────────┐
│ Garage      │
│ 📷 photo    │
└─────────────┘

┌─────────────┐
│ Kitchen     │
│ 📷 photo    │
└─────────────┘

┌─────────────┐
│ Office      │
│ 📷 photo    │
└─────────────┘
```

Tap container → browse.

Very intuitive.

---

## Option C — Power User

Best for inventory-heavy users.

### Search Screen

```text
Search
────────────────

[____________]

Filters

☑ Containers
☑ Items

☑ Electronics
☑ Documents

☑ High Priority

Results
────────────────
Switch Rack
Router
Tax Documents
```

---

# Recommended Tech Stack

Finalized direction:

### Frontend

- Next.js (App Router)
- TypeScript
- PWA (manifest + service worker)
- Mobile-first UI for Pixel 9 Pro, iPhone 14 Pro, and iPhone 15 Pro

### UI

- Tailwind CSS (recommended for fast mobile-first iteration)
- Optional component layer: shadcn/ui or Mantine

### Backend

- Supabase PostgREST + RLS policies
- Supabase Edge Functions (only for custom business logic)

### Database

- Supabase PostgreSQL

### Storage

- Supabase Storage (or Cloudflare R2 later if photo egress grows)

### Auth

- Supabase Auth (invite-only model)

### Hosting

- Vercel for Next.js deployment

For your expected usage (family-sized inventory):

**Monthly cost can stay very low initially** with:

- Vercel Hobby/Pro (based on usage)
- Supabase Free/Pro tier (based on storage and traffic)

---

# Feature Roadmap

### MVP (v1)

✅ Containers
✅ Items
✅ Photos
✅ Search
✅ Sharing
✅ Audit logs
✅ PWA install support on Pixel 9 Pro, iPhone 14 Pro, iPhone 15 Pro
✅ Mobile-first navigation and forms

### v2

✅ QR labels
✅ Barcode scanning
✅ Export to PDF/Excel
✅ Cost reports

### v3

✅ Warranty reminders
✅ Expiration tracking
✅ AI photo recognition
✅ "Where did I put it?" assistant

### v4

✅ Voice search

```text
"Where is the spare HDMI cable?"
```

✅ Home inventory insurance report

---

My strongest recommendation: **add `container_type`, `category/subcategory`, purchase/warranty fields, and a materialized path column now.** Those four additions will save major schema migrations later and make Home Catalog feel much more complete from day one.
