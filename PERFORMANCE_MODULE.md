# Performance Management

Added to the HR system at `D:\projects\hr system`, using the existing blue/white theme, authentication, canonical employee records and reporting-manager relationship.

Open **Performance Management → Performance**, or visit `http://localhost:5174/performance` while the existing HR frontend and backend are running.

## First setup

1. Open **Templates → New template**. The form starts with 70% goals and 30% competencies. Add questions and competencies; the total must equal 100%. Save, then publish.
2. Open **Review cycles → New cycle**. Choose the published template, dates and participating employees. Save the private draft, then launch it. Launch creates real employee reviews and in-app assignment notifications. Future cycles stay scheduled until their start date.
3. Select that cycle in the page header. Open **Goals & check-ins → Common goal library**. Create reusable goals, optionally with milestones, and assign them to selected participants. Assigned weights cannot exceed the template's goal contribution and must equal it before assessments are shared.
4. Employees open their assigned review to record check-ins and evidence, save their self-assessment, and share it.
5. Reporting managers read the shared self-assessment, rate goals and competencies, save a draft, then share the manager assessment.
6. Invite up to five peer reviewers if needed. Reviewers receive their requests in **360° feedback → Requests for you**. Responses are attributed, not anonymous. Employees see responses after closure; HR and the reporting manager can see submitted responses earlier.
7. Agree development actions, record the final meeting, satisfy the closure checks, and close the review. The employee can then acknowledge receipt. Close and optionally archive the cycle once every review is closed.

## Access and business rules

- HR administrators configure templates/cycles and manage reviews, except they cannot submit another employee's self-assessment or another reviewer's feedback.
- Employees see their own reviews. Reporting managers see their own reviews and their direct reports, determined from `employee_information_employees.reportingManagerId` on the server.
- CEO company-wide read access requires an active, top-level employee with a designation containing `CEO` or `Chief Executive Officer`. Merely lacking a reporting manager does not grant executive access. CEO users may assess their direct reports but do not gain HR configuration rights solely from their title.
- Staff access is part of the new module; it does not change existing module permission records. Candidates cannot access Performance.
- Progress and scores are separate. Manual check-ins or completed milestone weights determine progress. Score = sum of `(manager rating / 5) × weight` for goals and competencies. Peer feedback is not added to this score.
- Deadline dates are displayed and do not automatically close a review or change goal progress.
- Shared assessments are locked. Closing also locks goals, check-ins, feedback and development actions. Acknowledgement only confirms receipt.
- Concurrent edits return a conflict rather than overwrite a newer review. Refresh before retrying a stale edit.
- Notifications and manual reminders are **in-app**, not email/SMS. Reminders are rate-limited to one per review per day. No background email scheduler has been added.
- CSV exports contain only server-authorised review data and escape spreadsheet formula prefixes.
- No demo employees, sample scores or real review assignments are created automatically.

## Storage and code

- Frontend: `frontend/src/modules/performance/` (separate page, hook, API client and feature components).
- Backend: `backend/src/modules/performance/` (validation, access scope, transactional services, queries and routes).
- API prefix: `/api/performance`.
- Additive, idempotent database setup runs on the first authenticated module request. It creates `hr_performance_templates`, `hr_performance_cycles`, `hr_performance_library`, `hr_performance_reviews`, `hr_performance_audit` and `hr_performance_notifications`.
- Review documents store their template and goal snapshots, so later library edits cannot rewrite a review's definitions. Mutations lock the cycle and review rows in a transaction and advance an optimistic version number.
- Older `performance_*` tables and disconnected legacy client files are preserved; the new hub does not read or overwrite them. Migrating those historical records is a separate task requiring a reviewed field mapping.

## Verification

From `backend`, run `node --import tsx tests/performance.integration.ts`. This test uses synthetic employees in a unique `hr_performance_test_*` database. It tests the HTTP API, authentication, scopes, dates, weights, duplicates, privacy, scoring, feedback, closure, acknowledgement and notifications. It removes only the database it created, even on failure. The configured database account needs permission to create and drop that temporary test database.

Type checks: run `node_modules/.bin/tsc --noEmit` separately in `backend` and `frontend`. Build the frontend with `npm run build`.
