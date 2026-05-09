# Ghar-Sanchay

Ghar-Sanchay is a family-first home inventory app to track where items are stored (room, box, bag), who can access shared folders, and how much everything costs.

## Why Ghar-Sanchay
- "Ghar" means home.
- "Sanchay" means collection/saving.
- Together, it reflects a structured home inventory for families.

## Core Goals
- Keep a searchable inventory of containers and items.
- Support parent-child hierarchy: container -> sub-container -> item.
- Track audit history (created, updated, removed by/date/reason).
- Allow invite-only access and shared collaboration.
- Manage photo attachments for real-world identification.

## Key Features (Planned)
- Container and item management.
- Quantity, notes, tags, location, serial number, priority, status.
- Computed container-level cost from descendant items.
- Share container access (default role: editor).
- Search within selected container subtree.

## Architecture and Planning Docs
- [Architecture Index](ARCHITECTURE-INDEX.md)
- [Solution Options](docs/01-solution-options.md)
- [Recommended Architecture](docs/02-recommended-architecture.md)
- [AWS Reference Architecture](docs/03-aws-reference-architecture.md)
- [Cost, Performance, Ops](docs/04-cost-performance-and-ops.md)
- [MVP Roadmap](docs/05-mvp-roadmap.md)
- [Migration and Alternatives](docs/06-migration-and-alternatives.md)

## Recommended Stack (Current)
- Frontend: Next.js PWA
- Backend: Supabase (Postgres + Auth + Storage)
- Optional optimization: Cloudflare R2 for photo cost control

## Project Status
- Current phase: architecture and planning complete.
- Next phase: schema migrations, RLS policies, and MVP implementation.

## Suggested Repository Topics
`inventory` `home-inventory` `family-app` `nextjs` `supabase` `pwa` `gujarat` `ghar-sanchay`

## Contributing
This project is currently maintained for personal/family usage. Contributions can be enabled once MVP is implemented.
