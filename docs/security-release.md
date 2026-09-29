# Security corrections: first release

This change closes unauthenticated API operations and self-assigned account privileges. It does not complete the platform audit.

## Database

Migration `20260929224858_secure_account_roles_and_api_events.sql` was applied to the Supabase project named **Plataforma RH** on 29 September 2026. Its version matches the remote migration history. The hosting environment's project association still needs verification before release.

Verified after migration:

- Authenticated users cannot update their role, plan, subscription status, allowance or profile email. Name and avatar edits remain available.
- The registration trigger accepts only student or company accounts; client-supplied admin roles become ordinary student accounts.
- Clients cannot insert notifications or edit their content. They can mark their own notifications read under the existing RLS policy.
- Notification event keys are unique, preventing concurrent duplicate sends for the same event/state.
- API limits are accessible only to the server service role. AI: 10 requests per 15 minutes per user, shared across AI routes. Matching and notifications: 30 requests per minute per user and operation.

Existing users and notifications were not rewritten. The private quota table deliberately has no client policies: only the service role can access it. Its informational advisor notice is expected.

## Application

All browser AI and notification requests now carry a Bearer session. The server validates the token using Supabase Auth and reads the protected role from `profiles`.

Candidates can generate only their own matches. Companies can generate matches or structure only vacancies they own. An explicit candidate or vacancy scope is always required. The obsolete destructive matching GET returns 410 and performs no database writes.

Notification recipients, content and relative destinations come from an existing application, contact request or recorded company action. Arbitrary client messages and recipient IDs are ignored. Unsupported events are rejected. Repeated identical events do not resend email; failed email delivery is not retried by replaying the event. A dedicated retry worker remains future work.

Curriculum parsing requires a nonempty file up to 10 MB. Company website scraping validates and pins public DNS addresses, revalidates each redirect, and limits response size and request duration. Push delivery remains unimplemented; these events use in-app and email channels.

## Verification

- `npm run test:security`: seven API/security tests and one isolated PostgreSQL migration test passed. External Auth responses and event queries are mocked; no real emails, AI calls, registrations or candidatures are performed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed with synthetic environment values; this verifies compilation and prerendering, not live integrations.
- ESLint for API helpers, API routes and security tests: passed.
- Full ESLint: 32 errors and 38 warnings remain. Baseline: 34 errors and 38 warnings. No new diagnostic categories were introduced in the comparison by file, rule and message.
- Database privilege checks after applying the migration: role/plan updates denied; name edits/read marking allowed; notification inserts denied; quota function restricted to service role; deduplication index present.

## Release order and pending verification

1. Confirm that the hosting environment uses the intended Supabase project and contains the existing Auth, service-role, OpenAI and Resend configuration. Never expose service-role credentials in browser variables.
2. If releasing against another environment, apply this migration there first.
3. Deploy this branch together with the authenticated browser callers. Do not deploy only the API guards.
4. In an isolated environment, exercise candidate, company and admin flows with test accounts and a test email destination: profile edits, vacancy creation, matching, application, contact request/reply and read marking.
5. Confirm 401 for missing/invalid sessions, 403 for foreign resources, 429 after the quota and 410 for the retired matching GET.

Still pending: protection of private candidate fields, contact-request state transitions, private CV access, ownership of company logos, compromised-password protection, full user-journey tests, legal pages and the pre-existing lint findings. The new guards do not establish that the whole platform is safe to launch.

Avoid rolling back the profile permission fix or restoring the destructive endpoint. If reverting application code, retain the database safeguards; the old server notification route already uses the service role and can continue creating notifications. Its arbitrary-message vulnerability remains until the corrected code is deployed.
