# Company vacancy archive and deletion

`manage_owned_job(job_id, action)` accepts archive, restore and delete. It runs with the caller's permissions, locks the vacancy, verifies company ownership and retains account-session RLS checks.

- Archive sets `archived_at` and disables publication. Archived vacancies are listed separately.
- Restore clears `archived_at` but keeps the vacancy inactive. Publication remains a separate action using the existing 30-day renewal flow.
- Delete is logical (`deleted_at`). It removes the vacancy from company management and prevents publication or restoration. Applications, contact requests, matches and other history are retained. It is not a personal-data erasure workflow.

The database trigger always disables archived/deleted vacancies, including updates from existing renewal RPCs. Browser roles cannot physically delete jobs, avoiding the existing cascading foreign keys. No existing vacancy is archived/deleted by the migration.

Run `npm run test:job-management` for ownership, invalid operations, anonymous access, restoration, publication guards and history preservation.
