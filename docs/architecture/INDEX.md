# Inventory App Architecture Documentation Index

Start here for all architecture and planning docs.

## Documents
- [Solution Options](01-solution-options.md)
  - Compares AWS, Supabase, Firebase options and final recommendation.
- [Recommended Architecture](02-recommended-architecture.md)
  - Detailed recommended architecture, schema, API, sharing model, and search.
- [AWS Reference Architecture](03-aws-reference-architecture.md)
  - AWS-only reference architecture if you decide to stay fully on AWS.
- [Cost, Performance, Ops](04-cost-performance-and-ops.md)
  - Billing/usage expectations, performance design, and operational controls.
- [MVP Roadmap](05-mvp-roadmap.md)
  - Phased MVP and delivery plan.
- [Migration and Alternatives](06-migration-and-alternatives.md)
  - Supabase to AWS migration effort and cheaper cloud alternatives for mid-high usage.
- [Model Improvements and UX Samples](07-model-improvements-ux-design-samples.md)
  - Improved data model with product metadata, warranty tracking, and sample UI designs.


## Current Recommendation
- Start with Supabase + Next.js PWA to keep cost near-free and complexity low for 4-6 users.
- Keep schema and API boundaries clean so migration to AWS serverless is possible later.
