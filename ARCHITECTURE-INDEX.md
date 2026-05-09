# Inventory App Architecture Documentation Index

Start here for all architecture and planning docs.

## Documents
- docs/01-solution-options.md
  - Compares AWS, Supabase, Firebase options and final recommendation.
- docs/02-recommended-architecture.md
  - Detailed recommended architecture, schema, API, sharing model, and search.
- docs/03-aws-reference-architecture.md
  - AWS-only reference architecture if you decide to stay fully on AWS.
- docs/04-cost-performance-and-ops.md
  - Billing/usage expectations, performance design, and operational controls.
- docs/05-mvp-roadmap.md
  - Phased MVP and delivery plan.
- docs/06-migration-and-alternatives.md
  - Supabase to AWS migration effort and cheaper cloud alternatives for mid-high usage.

## Current Recommendation
- Start with Supabase + Next.js PWA to keep cost near-free and complexity low for 4-6 users.
- Keep schema and API boundaries clean so migration to AWS serverless is possible later.
