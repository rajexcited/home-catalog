# Inventory App - Solution Options and Recommendation

## 1) Your Core Requirements (Interpreted)
- Hierarchical storage model: Folder (or Group) can contain child folders and items.
- Rich item metadata: name, location, tags, notes, quantity, photos, cost, serial number, priority, product metadata.
- Folder-level computed cost from descendants.
- Invite-only access.
- Sharing between users with default write permissions for shared members.
- Search scoped within parent folder.
- Audit fields for create/update/remove actions.
- Small scale initial usage: about 4-6 users (family).

## 2) Candidate Architectures

### Option A - AWS Serverless (Fully on AWS)
- Frontend: React (PWA) hosted on S3 + CloudFront.
- Auth: Amazon Cognito (invite-only setup via admin invite flow).
- API: API Gateway + Lambda.
- Database: DynamoDB (single-table or multi-table design).
- Photo storage: S3 with pre-signed upload URLs.
- Search: start with DynamoDB GSI-based search by parent + tokenized prefixes; optionally OpenSearch later.
- Audit logging: DynamoDB streams or direct audit table writes.
- Monitoring: CloudWatch.

Pros:
- Very reliable and scalable.
- Fine-grained control and enterprise-grade security.
- Good long-term if app grows beyond family use.

Cons:
- Higher architecture and operations complexity.
- Cost can be low but bills are split across many services and can be harder to predict for newcomers.
- More implementation effort for role-sharing and hierarchical queries.

### Option B - Supabase + Object Storage (Near-Free Start)
- Frontend: Next.js PWA deployed on Vercel (web-first, mobile-friendly).
- Auth: Supabase Auth (magic link/email invite flow).
- Database: Supabase Postgres with Row Level Security (RLS).
- Photos: Supabase Storage (or Cloudflare R2 for lower storage/egress cost).
- Search: Postgres full-text search scoped by parent_id.
- Realtime sync: Supabase realtime subscriptions for collaborative edits.

Pros:
- Cheapest and fastest way to launch for 4-6 users.
- SQL + relational model fits folder/item hierarchy and sharing naturally.
- RLS gives strong per-user and per-folder security without writing lots of backend code.
- Easy migration path to larger architecture later.

Cons:
- Some platform coupling to Supabase ecosystem.
- Free tier limits require monitoring if photos grow heavily.
- Less low-level control than building every layer on AWS.

### Option C - Firebase (Firestore + Storage)
- Frontend: Flutter or React Native + web.
- Auth: Firebase Auth.
- Database: Firestore.
- Photos: Firebase Storage.

Pros:
- Fast MVP and strong client SDKs.
- Good for realtime sync.

Cons:
- Complex hierarchical cost aggregation and reporting become harder than SQL.
- Query model may become awkward for flexible folder/item/reporting use cases.

## 3) Best Recommendation
For your current expected usage (4-6 users, family collaboration, low budget), the best fit is:

**Option B: Supabase + Next.js on Vercel + PWA + Supabase Storage (or R2)**

Why:
- Delivers near-free monthly cost for current usage.
- Fastest to implement with fewer moving parts.
- SQL model is ideal for folder/item nesting, sharing, and computed summaries.
- Security (invite-only + shared-folder access) is cleanly enforced using RLS.

When to choose AWS instead:
- You want all-in AWS from day one.
- You expect strong growth, strict enterprise controls, or deeper AWS integration later.

## 4) Naming Suggestion
Use **Container** instead of folder/group in data model and UI labels if you want neutral naming. Keep display label as Folder in UI for user familiarity.
