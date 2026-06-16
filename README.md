# Home-Catalog

Home-Catalog is a family-first home inventory app to track where items are stored (room, box, bag), who can access shared folders, and how much everything costs.

## Why Home-Catalog

- Personal inventory management is a common need for families, but existing solutions are often too generic or business-focused.
- A home inventory app can help families stay organized, track their belongings, and manage shared access among family members.
- Together, it reflects a structured home inventory for families.

## Core Goals

- Keep a searchable inventory of containers and items.
- Support parent-child hierarchy: container -> sub-container -> item.
- Track audit history (created, updated, removed by/date/reason).
- Allow invite-only access and shared collaboration.
- Manage photo attachments for real-world identification.
- Track warranty information for items.

## Key Features (Planned)

- Container and item management.
- Quantity, notes, tags, location, serial number, priority, status.
- Computed container-level cost from descendant items.
- Share container access (default role: editor).
- Search within selected container subtree.

## Architecture and Planning Docs

- [Architecture Index](docs/architecture/INDEX.md)
- [Solution Options](docs/architecture/01-solution-options.md)
- [Recommended Architecture](docs/architecture/02-recommended-architecture.md)
- [AWS Reference Architecture](docs/architecture/03-aws-reference-architecture.md)
- [Cost, Performance, Ops](docs/architecture/04-cost-performance-and-ops.md)
- [MVP Roadmap](docs/architecture/05-mvp-roadmap.md)
- [Migration and Alternatives](docs/architecture/06-migration-and-alternatives.md)
- [Model Improvements and UX Samples](docs/architecture/07-model-improvements-ux-design-samples.md)

## Coding Layout

- `apps/web`: Next.js app (frontend UI + routes).
- `supabase/migrations`: SQL migrations.
- `supabase/functions`: Supabase edge functions.
- `supabase/seed`: seed files for local/dev data.
- `packages/shared`: shared types, utilities, and constants.
- `data/samples`: sample inventory files.
- `scripts`: local automation scripts.
- `tests`: integration and end-to-end tests.

## Recommended Stack (Current)

- Frontend: Next.js PWA on Vercel
- Backend: Supabase (Postgres + Auth + Storage)
- Optional optimization: Cloudflare R2 for photo cost control

## MVP Device Scope

- Mobile-first launch for Pixel 9 Pro, iPhone 14 Pro, and iPhone 15 Pro.
- Desktop and tablet optimization planned after MVP.

## Project Status

- Current phase: architecture and planning complete.
- Next phase: schema migrations, RLS policies, and MVP implementation.

## Suggested Repository Topics

`inventory` `home-inventory` `family-app` `nextjs` `supabase` `pwa` `gujarat` `home-catalog`

## Contributing

This project is currently maintained for personal/family usage. Contributions can be enabled once MVP is implemented.
