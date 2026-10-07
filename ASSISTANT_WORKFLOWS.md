# ReadyHR Assistant workflow update

Implementation location: `D:\projects\hr system`. Open `http://localhost:5174/assistant`.

## Available workflows

- Invitation by name and email; optional employment details; safe resend of an existing pending invitation. Delegated onboarding users cannot create administrator accounts.
- Scoped document lists and document decisions. A person must inspect and approve documents; the bot does not authenticate document contents automatically.
- Agreement creation using supplied, approved wording. Preview contains the rendered wording. Required documents must be approved first. Email results distinguish SMTP acceptance from failure, not guaranteed inbox delivery.
- After the candidate signs: **Complete onboarding and activate employee** copies submitted profile/contact/bank information, allocates an employee number, maps company/location/department/designation/employment type, validates the reporting manager, assigns a roster and changes the existing candidate login to Employee. These database changes are transactional. Leave-calculation failures are reported separately.
- Workflow updates for invitation acceptance/decline, pending documents, agreement readiness/signing, leave requests/decisions, attendance corrections/decisions and performance updates. Unread counts refresh every 30 seconds while signed in, even with the assistant minimized. This is not an offline push/email notification service.
- Performance goal library creation, cycle creation/launch, employee or reporting-branch goal assignment, existing review actions and reports. Full delegated Performance permission enables the corresponding administrative workflows; ordinary employees retain their own view.
- Existing own attendance/leave tasks, plus working-shift creation and employee roster assignment.
- Confirmed module full-access grants. Legacy `ALL` and newer `ORGANIZATION` scope names are compatible; unrelated module grants and login roles are preserved.
- EIM custom tables with typed fields, employee-linked records and an EIM view button. These are extension tables, not arbitrary SQL/schema execution.
- Employee detail edits: first/last name, birth date, gender, nationality, marital status, blood group, religion, employment type, joining/permanent date, probation status, payroll number, personal email, mobile and LinkedIn. Dedicated existing actions handle department, designation, reporting manager and custom fields. Contact changes preserve unrelated contact data and never change login credentials.
- English typo-aware guided commands, greetings and a small built-in joke response. No external AI service is connected.
- "Any team leave requests?" now means actual direct reports, intersected with the account's permitted visibility—even for accounts with organization-wide access. It does not mean every employee in the organization.
- The Assistant has separate **Pending requests** and **Updates** tabs. Pending leave decisions, attendance corrections, document reviews and onboarding readiness stay visible until their underlying workflow is resolved. Old read receipts cannot hide these items. Pending items are not subject to the ordinary 50-update limit. "Any request", "any requst" and "show pending requests" open the same scoped pending-work list.

## Try these commands

Use real values only when you intend to submit them. Changes show a preview and need confirmation.

```text
What can you do?
Onboard Jane Doe jane.doe@example.test
Resend an onboarding invitation
Show pending onboarding documents
Send an employment agreement
Complete onboarding for a candidate
Give [employee name] full access to performance
Create a performance goal
Assign a goal to an employee
Create a shift
Assign a roster group to an employee
Update employee details
Create an EIM table
How many leaves do I have?
Mark my attendence today
```

Names/emails in examples are placeholders. Incomplete commands collect missing details. Ambiguous leave dates are not guessed.

## Important remaining boundaries

- The assistant is a registered-workflow interface, not a general ChatGPT/Gemini model and not an unrestricted browser/button operator. Not every system action or employee field is covered yet.
- Permanent deletion uses a separate Employee Information **Delete** grant, exact employee number, typed `DELETE`, a preview and a transaction. It removes supported dependent database records and the login. It refuses Owner/self deletion and unresolved reporting/approval dependencies.
- **Full deletion of uploaded documents/signatures and every legacy history store is not implemented.** Employees with attached document/contract records are blocked before deletion so files are not orphaned. Audit receipts remain. This is not yet the requested unrestricted whole-system purge.
- SMTP is configured locally, but no real invitation/agreement emails were sent during verification. Tests explicitly disabled email. A live delivery test needs an intended recipient.
- Full automation cannot verify the authenticity of documents or invent approved contract terms; those decisions require review.

## Verification

Backend and frontend production builds passed. Test commands (from `backend`):

```text
npx tsx tests/assistant.intent.ts
npx tsx tests/assistant.integration.ts
npx tsx tests/assistant.workflows.ts
npx tsx tests/assistant.employee-details.ts
node scripts/validate-assistant-live.cjs
```

The write suites use temporary databases with synthetic data, then remove those databases. Employee-detail tests copy table structure only from the installed database. The live suite checks Owner, Employee, Manager and CEO reads; it does not alter HR records. Browser verification checked the minimized update badge, update panel and greeting response.

Existing project changes were preserved. No real employee was deleted or activated during verification.
