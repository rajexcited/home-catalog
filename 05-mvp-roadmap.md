# MVP Roadmap and Build Plan

## 1) Suggested Stack (Final)
- Client: Next.js + TypeScript + Tailwind (responsive PWA).
- Backend: Supabase Postgres + Auth + Storage + RLS.
- Optional helper backend: Supabase Edge Functions for advanced logic.

Reason this is best now:
- One codebase for desktop and mobile web.
- Lowest operational burden.
- Near-free for family-scale usage.

## 2) MVP Scope (Phase 1)
- Invite-only sign-in.
- Create/update/delete containers and items (soft delete).
- Parent-child container tree.
- Item metadata with cost, quantity, serial number, priority.
- Photo upload and attach to items.
- Share container with users (default role: editor).
- Search within selected container subtree.
- Audit timeline for create/update/remove/share actions.

## 3) Post-MVP (Phase 2)
- Offline support for read + queued writes.
- Barcode/QR scan for quick item lookup.
- Bulk import/export CSV.
- Notifications for changes in shared containers.

## 4) Delivery Plan

### Week 1
- Project setup, auth, DB schema, RLS policies.
- Basic container and item CRUD pages.

### Week 2
- Sharing workflow and permission checks.
- Photo upload and item detail page.
- Search endpoint and UI filters.

### Week 3
- Audit log UI.
- Cost roll-up query and optimization.
- Polishing + backup/monitoring setup.

## 5) Testing Strategy
- Unit tests for:
  - cost roll-up logic
  - permission guards
  - search scope filters
- Integration tests for:
  - invite flow
  - share/unshare behavior
  - soft delete and restore scenarios
- Basic load test target:
  - p95 item list < 300ms for 5k items.

## 6) Risks and Mitigations
- Risk: incorrect permission logic.
  - Mitigation: strict RLS + automated policy tests.
- Risk: search slowing with growth.
  - Mitigation: add proper indexes and cached summaries.
- Risk: storage cost creep from photos.
  - Mitigation: compress images + enforce size limits + lifecycle rules.
