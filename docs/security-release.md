# Security corrections: first release

This change closes unauthenticated API operations and self-assigned account privileges. It does not complete the platform audit.

## Database

Migration `20260929224858_secure_account_roles_and_api_events.sql` was applied to the Supabase project named **Plataforma RH** on 29 September 2026. Its version matches the remote migration history. The production frontend's public Supabase URL was verified against this project on 30 September 2026 (Europe/Lisbon).

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

## Candidate privacy follow-up (applied)

Migration `20260929232747_protect_candidate_privacy.sql` was applied after the frontend deployment completed. Its version matches the connected project history. Local PostgreSQL tests verified its behavior before application.

- A match alone no longer grants full student row access. Full access requires an application to the company's vacancy, an accepted request while the candidate accepts requests, or an open profile matched to that company. An unrelated company receives no snapshot or CV.
- `company_candidate_snapshots` is a bounded, authenticated company RPC. Protected previews contain only explicitly selected presentation fields; they exclude name, email, phone, biography, CV, generated summary and avatar. Complete profile details and identity remain available after authorization.
- Contact requests must refer to the company's own vacancy and a matching candidate who accepts requests. Only that candidate can change a pending request to accepted or rejected. Identity fields cannot be reassigned; companies cannot reopen answered requests. No existing requests are rewritten.
- Companies can update only the status column of applications. Logo insert/update/delete policies check the company folder owner. CV Storage reads use the same candidate authorization.
- Private CV downloads use the caller's token and RLS, with no service-role bypass or publicly reusable signed URL. Stored paths and legacy same-project private bucket URLs are supported; external URL references require a new upload. Responses disable caching and force attachment downloads.
- Uploads allow PDF/DOCX up to 10 MB; logos allow JPEG/PNG/WebP up to 5 MB. These MIME and extension checks are not malware scanning or complete content validation.
- A CV is saved before AI processing; AI failure leaves the uploaded CV available. Replacement attempts deletion of the previous internal file after saving the new reference. Failed cleanup is reported. The owner can download or delete a CV. Legacy external references are not fetched or deleted. Concurrent editing across tabs and orphan cleanup still need operational testing.
- The live schema inspection found `phone`, `main_role`, `expected_salary` and `preferred_regions` absent although existing profile forms use them. The migration adds nullable text columns; existing records receive no invented values.

Validation for this follow-up: 11 total security tests passed, TypeScript passed, production build passed with synthetic environment values. Full ESLint remains 32 errors and 38 warnings. Tests cover consent transitions, unrelated companies, matched previews, open/closed visibility, applicant access, CV row visibility, logo isolation, foreign CV references and missing authentication. They run locally with synthetic records; they do not prove live browser uploads, downloads, AI or emails. No production deployment or merge has been performed.

Remaining security work includes authorization of company candidate actions, application creation/status validation, generated matching text potentially containing private details, historical request integrity, compromised-password protection, file content scanning, notification retries and complete authenticated user journeys. Real storage/bucket behavior and hosting environment association require verification before release.

## Recruitment write validation (applied)

Migration `20260929232748_validate_recruitment_actions.sql` was applied immediately after the privacy migration. Its version matches the connected project history. It adds guards for direct Data API writes, not just browser controls:

- Candidates may insert only their own student identifier and vacancy identifier. New applications start pending; client-supplied status, identifiers and timestamps are not accepted as writable fields. Vacancies must be active; the check takes a shared row lock to serialize against concurrent vacancy closure. The existing unique application constraint prevents repeated submissions.
- Only the owning company role can change application status, within the existing pending/accepted/rejected values. Candidate, vacancy, ID and creation time are immutable. The interface checks the previously displayed status and requires a returned record, so stale or denied updates do not display success or trigger a notification. Switching between accepted/rejected remains supported by the existing interface; no new terminal-state requirement has been invented.
- Company actions are restricted to shortlisted/accepted, an owned vacancy and a candidate associated through an application or match. Shortlisting a protected match remains available, as in the match interface. Acceptance requires an application, open visibility or accepted consent for that exact vacancy. Consent for another vacancy is insufficient. Existing action records can be removed under the ownership policy; they cannot be rewritten to another candidate/vacancy. New records have database timestamps.
- Unique indexes prevent repeated company actions and candidate preferences. Read-only checks found zero duplicate groups in both connected tables. If duplicates appear before release, index creation will fail rather than silently delete data.
- The candidate match button previously wrote an `applied` preference without submitting an application. It now links to the vacancy application flow. New preferences are limited to saved/ignored for available vacancies. Historical applied preferences are retained but are not presented as confirmed applications.
- Company insert duplicate errors use PostgreSQL code 23505 consistently. Public/mobile application pages distinguish an existing application from other submission failures and avoid a second in-page submission while processing.

Validation: the suite now has 12 passing tests. The new isolated PostgreSQL test covers forged status/identity, inactive vacancies, repeated submissions, company isolation, exact-vacancy consent, protected shortlists, duplicate actions/preferences, immutable actions and rejection of fake applied preferences. TypeScript and synthetic production build passed. Full ESLint still reports 32 errors and 38 warnings with zero new diagnostic signatures. This does not establish live end-to-end behavior; no production data was rewritten and no deployment occurred.

Product decisions still needed: premium-plan restrictions differ between the match and candidate detail interfaces; the new ownership and consent guards intentionally do not invent a billing rule. There is no user-facing audit trail for application status changes yet. Full browser testing, integration error recovery, generated matching text privacy and historical consent review remain pending.


## Deployment confirmation (30 September 2026, Europe/Lisbon)

The user authorized integration into main and then application of the outstanding migrations. GitHub merge commit `59f0bfc6a6e1f26f3086838a07e494856245f4a0` has a successful Vercel deployment status. The production login page JavaScript references Supabase project `kxpjiozlcuudffhucpdr`; no credentials were recorded in this check. Both follow-up migrations were applied to that project without rewriting candidate, application or contact records. Local filenames were aligned to the versions generated by the remote migration history.

Live privilege inspection confirmed: clients cannot supply an initial application status or reassign its candidate; status updates remain granted subject to RLS and the trigger; company action updates are denied; anonymous snapshot execution is denied. All four validation triggers exist. Live configuration inspection also confirmed both unique indexes and the CV/logo bucket restrictions. These are configuration checks, not complete authenticated browser tests.

Security advisors still flag `set_updated_at` without a fixed search path and disabled compromised-password protection. The two authenticated SECURITY DEFINER functions are intentional guarded company lookups: both have fixed search paths and caller checks; the preview RPC is bounded. The private quota table deliberately has no client policies. Three other pre-existing RLS tables without policies remain inaccessible to clients and need a product review. Full user journeys, real CV uploads/downloads and external communications remain unverified.
