## User:

My new Tasks:

- Add new admin policies - admin should be able to do anything on any table even if admin is not owner. but all of admin's actions should be recorded to audit logs. not sure how much can be covered through db and how much should be cover through JS code wither on supabase server side or browser client side
- Add policy for owner that cannot delete anything.
- I want to allow admin to invite members, who can only login by google or facebook auth, so i dont need to maintain the password based auth. By default no one can signup. only admin is allow to invite. and only invitee can sign in. for dev testing, i will go with password based auth for simplicity. for prod, i dont want password based auth.
- Suggest suitable approaches to include shareable functionalities. suggest which is good with reasons. user can share any containers from available members list. the share action can be Editable or Viewable.
  - if Editable members can update container or its children but cannot remove. can share to other members.
  - if viewable, member can only view / search container and its children, cannot share to other members.

## Github Copilot:

Great task list. Best way to do this safely is to enforce almost all security in Postgres (RLS + triggers), and use app code only for workflows and UI.

Recommended split

1. Database (must enforce)

- Who can read/write which rows
- Invite-only account creation gate
- No-delete rule for non-admins
- Admin override
- Audit logging for admin data changes

2. App code (workflow only)

- Admin invite UI and API endpoint
- Dev vs prod auth-mode handling
- Share dialog and member picker
- Friendly error messages

Task-by-task design

1. Admin can do anything, and admin actions must be audited

- Add helper function: is_admin(user_id)
- Add admin RLS policies on all app tables (users, containers, items, container_types, item_categories, share tables, invite tables)
- Add AFTER INSERT/UPDATE/DELETE triggers on core tables that write audit rows when actor is admin
- Keep audit logging in DB so it works for browser and server-side calls using user JWT

Important limitation

- If you use service-role key for user actions, auth.uid is usually null and user-level audit attribution is lost
- For end-user actions, prefer user session clients (browser or server action with user cookies), not service-role

2. Owner cannot delete anything

- Remove owner DELETE policies on containers/items (and other protected tables)
- Keep DELETE allowed only for admin
- Result: owner can still create/update their own data, but cannot delete

3. Invite-only auth, OAuth-only in prod, password in dev
   Recommended approach

- Add table: invited_emails
  - email, invited_by, role_to_assign, status, expires_at, accepted_at
- Add trigger on auth.users BEFORE INSERT:
  - allow if email exists in invited_emails with valid status
  - otherwise raise exception (signup not allowed)
- Add trigger on auth.users AFTER INSERT:
  - mark invite accepted and upsert public.users row
- In Supabase Auth settings:
  - Prod: disable email/password signups, enable Google/Facebook
  - Dev: keep password enabled if needed
- Even with OAuth enabled, non-invited users are blocked by DB trigger

This gives you invite-only plus OAuth-only in prod without relying on frontend checks.

4. Shareable containers with view/edit roles
   Best approach: explicit ACL table (recommended)

- Add table: container_shares
  - container_id
  - member_user_id
  - permission enum: view or edit
  - can_reshare boolean (or infer true when permission is edit)
  - granted_by
  - created_at
- Add function user_can_view_container(user_id, container_id)
- Add function user_can_edit_container(user_id, container_id)
- Policies:
  - View role: select/search only
  - Edit role: insert/update on container subtree and items, but no delete
  - Only owner/admin/edit+reshare can create shares
  - View role cannot share
- Add audit entries for share grant/revoke/permission-change

About subtree (children) permissions

- You need one of:
  - Recursive helper function using parent_id (simpler, good start)
  - Path/closure table for faster large hierarchies (better at scale)

Given your app size now, recursive helper is likely enough.

Which sharing model is best

- Best for your requirements: member ACL table (container_shares)
- Why:
  - precise permissions
  - easy to enforce no-delete for editors
  - supports reshare rules
  - auditable by row
  - works with RLS cleanly

Link-token sharing is not ideal here because it is weak for member-specific edit/view governance and audit trails.

How much can be covered in DB vs JS

- DB can cover almost everything you listed, including invite-only enforcement and audit
- JS should only orchestrate actions and UX; do not trust JS for authorization

Implementation plan I recommend

Phase 1

- Add is_admin function
- Add admin override policies
- Remove owner delete policies
- Add admin audit triggers

Phase 2

- Add invited_emails table + auth.users gate trigger
- Add admin invite API/UI
- Configure prod auth providers in Supabase dashboard

Phase 3

- Add container_shares + permission functions + RLS
- Update queries/search to include shared scope
- Add share UI and audit events

If you want, I can now create a full migration set for these phases in your repo (new migration files, not rewriting your base file), plus the minimal server-side endpoints in actions.ts.
