# Cost, Usage, Performance, and Operational Guidance

## 1) Cost Expectations for Your Scale
Assumptions:
- 4-6 users.
- Few hundred to few thousand items.
- Low-medium photo uploads.
- Daily usage is light.

### Supabase-first expected range
- Month 0-6 (MVP usage): often free tier is enough.
- After growth (more photos/search): typically about USD 5-25/month.

Primary cost drivers:
- Storage volume (photos).
- Egress/download traffic.
- Database size and compute if usage grows.

### AWS serverless expected range
- Light usage is often in low single-digit USD, and can move to low teens as photos and traffic grow.
- More billing dimensions across multiple services.

Primary cost drivers:
- S3/CloudFront egress.
- Lambda and API Gateway request volume.
- DynamoDB read/write patterns.

## 1.1) Billing Example for 4-6 Users (100-400 Items/Containers Each)
The numbers below are planning estimates, not an invoice. Actual billing depends on region, final image size, and traffic patterns.

Assumptions used for examples:
- Total entities (items + containers): 400 to 2400.
- Photos: 1-2 photos per entity.
- Effective average mobile photo size after app compression: 0.8 MB.
- Monthly read/write activity remains light to moderate (family usage).

Estimated stored photos and storage footprint:
- Low case: 600 photos (roughly 400 entities x 1.5 photos) -> about 0.48 GB.
- Mid case: 1800 photos (roughly 1200 entities x 1.5 photos) -> about 1.44 GB.
- High case: 4800 photos (roughly 2400 entities x 2 photos) -> about 3.84 GB.

Estimated monthly billing examples:

### Example A (Low)
- Profile: 4 users, about 100 entities each, about 1-2 photos each.
- Supabase-first: about USD 0/month (typically within free tier limits).
- AWS serverless: about USD 1-4/month.

### Example B (Mid)
- Profile: 5 users, about 200 entities each, about 1-2 photos each.
- Supabase-first: about USD 0-25/month (may still fit free tier, otherwise base paid plan).
- AWS serverless: about USD 3-8/month.

### Example C (High for your current family scope)
- Profile: 6 users, about 400 entities each, about 2 photos each.
- Supabase-first: about USD 25-35/month (paid plan plus possible storage/egress overage).
- AWS serverless: about USD 8-18/month.

Cost interpretation for your case:
- If you stay near the low/mid profile, Supabase is easiest and often free.
- If you consistently run near high profile, AWS pay-as-you-go can be cheaper on raw bill, but has more setup and maintenance complexity.
- The best practical tradeoff for now is still Supabase-first for speed and simplicity, then reassess once your real 2-3 month usage data is available.

How to keep monthly cost low in either option:
- Compress photos before upload (target <= 1 MB each).
- Generate thumbnails and load full images only on demand.
- Add storage lifecycle policy for deleted or duplicate images.
- Add monthly budget alerts and egress alerts from day one.

## 2) Performance Design

### Data/query performance
- Keep parent-child hierarchy indexed.
- Use pagination for item lists.
- Use projection fields for list views (do not fetch full details always).
- Precompute expensive container summaries if latency grows.

### Photo performance
- Generate thumbnails (small, medium, full).
- Lazy-load galleries.
- Compress uploads on client before sending (mobile bandwidth savings).

### Search performance
- Start with Postgres full-text + indexed filters.
- Add trigram index only if fuzzy search needed.
- Consider dedicated search engine only after real bottlenecks.

## 3) Security and Privacy
- Invite-only sign-in.
- RLS (or equivalent) for per-container access.
- Signed URLs for private photo access.
- Soft-delete with audit fields instead of hard delete by default.
- Daily automated backups and monthly restore test.

## 4) Reliability and Backup
- Backup policy:
  - Daily DB backup.
  - Object storage lifecycle + versioning for photos.
- Recovery target:
  - RPO <= 24h initially.
  - RTO <= 4h for personal/family use.

## 5) Operational Checklist
- Observability:
  - Error rate dashboard.
  - Slow query dashboard.
  - Storage growth alert.
- Budget controls:
  - Monthly budget alert (e.g., USD 10, USD 25).
  - Egress alert for sudden spikes.
- Data hygiene:
  - Periodic cleanup of orphan photo records.
  - Validate audit consistency monthly.

## 6) Scale Triggers and Upgrade Path
Move from near-free to stronger setup when any trigger is true:
- Users > 50.
- Items > 100k.
- Photos > 200GB.
- Search latency > 500ms p95 for normal queries.

Suggested migration path:
1. Supabase free -> paid tier.
2. Add CDN and image optimization.
3. Split heavy workloads into edge/server functions.
4. If needed, migrate to AWS full serverless using same domain model.
