# Notification read state

Opening a notification saves its read state before navigation. Explicit read and
read-all actions acknowledge only the IDs returned as read by Supabase, scoped
to the signed-in owner. Failed or zero-row updates show an error and do not
acknowledge the notification locally. Read-all uses the displayed snapshot;
notifications arriving later remain unread.

Read actions, renewal confirmations and contact responses refresh the header
counter. Storage events synchronize other tabs; focus and navigation refresh
the counter from the database. Null and false states both count as unread.
Late queries cannot overwrite a newer read state or header count. Pending
contact decisions remain pending until the candidate responds; reading does not
grant access to a profile.

Verification (2026-10-01):
- `npm run test:notifications`: four passing tests covering persistence,
  ownership, failed writes, repeated reads, snapshot behavior and notifications
  across tabs (mocked client/browser).
- Live database policies and column grants checked: owner-only SELECT/UPDATE,
  authenticated UPDATE permission on `is_read`, RLS enabled.
- Transactional database fixture test passed: own read persisted on subsequent
  SELECT; foreign update affected zero rows. ROLLBACK removed both fixtures and
  any queued emails. No emails were sent and no user notifications were changed.
- Type checking and production build passed. Targeted lint has no errors;
  an existing company-logo `img` warning remains.

Authenticated visual verification in a browser remains pending; database and
automated checks do not substitute for that check.
