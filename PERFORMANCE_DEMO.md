# ReadyHR performance demo

The local Performance module is populated using the 27 active employees and their existing reporting hierarchy. All inserted goals, ratings, comments, check-ins and feedback are **fictional practice data**, not actual employee evaluations. Accounts, passwords, employee records, the existing `annual pr` cycle and legacy performance history were not replaced.

Open http://localhost:5174/performance#overview. On a fresh page load, the most recently created active cycle is selected. Choose another cycle in the Review cycle selector when needed.

## Included examples

| Cycle | State | Reviews | Purpose |
| --- | --- | --- | --- |
| DEMO · Current performance review | Active | 27 | Editable drafts, submitted self-assessments, manager drafts, pending feedback, ready-to-close and closed examples |
| DEMO · Previous completed review | Closed | 26 | Final ratings, completed development actions and employee acknowledgements |
| DEMO · Upcoming review draft | Draft | 0 until launched | Optional next-cycle setup; hidden from employees |

There is one published demo template (70% goals / 30% competencies), 16 reusable department-specific library goals, 106 assigned goals, 212 check-ins and 53 development actions. Demo cycle dates are set relative to the first setup date, 24 September 2026. Re-running setup does not reset dates or overwrite edits.

The Owner has no reporting manager. Their current review is a self-development draft; no manager assessment or self-approval is fabricated. The previous completed cycle excludes the Owner. Closing the entire current cycle requires every participant's review to be legitimately completed; it is not a one-click demo reset.

## What to try

- **Praveen / Owner:** company overview, all 27 current reviews, templates, goal library, reports, and the prepared future cycle.
- **Dilan / CEO:** company-wide reviews and reports; assessment edits remain limited to authorized reporting relationships.
- **Dinithi / Support Lead:** team reviews including Kavindu's pending feedback, Nethmi's manager draft and Sunil's ready-to-close review.
- **Kasun Bandara / EMP-027:** own goals with check-ins, an editable self-assessment draft, a development action and a pending peer-feedback invitation. Select the previous completed cycle → Self-assessment to view the final result and acknowledge receipt.
- Other employees see only their own reviews; managers see their permitted reporting teams. Existing first-login password-change requirements remain enforced.

Use the normal Save draft, Share assessment, Record check-in, feedback, development and closure buttons. Changes persist. Sharing locks assessments; closing locks the review. The demo banner and DEMO cycle/goal names identify the synthetic content, including CSV exports.

## Repeat-safe setup and checks

Run from `D:\projects\hr system\backend`:

```powershell
npm run performance:demo             # Preview only
npm run performance:demo -- --apply   # Insert once; later runs skip existing demo data
npm run build
node scripts/validate-performance-demo.cjs
npx tsx tests/performance.integration.ts
npx tsx --tsconfig ../frontend/tsconfig.json ../frontend/tests/performance-demo.test.tsx
```

The validator is a baseline check intended immediately after setup; intentional user edits may change its expected sample stages. Integration tests use a uniquely named isolated database, not the HR database.

Verified after setup: 13 isolated workflow checks, 69 live read-only API checks, role-specific component rendering, frontend type checking, and frontend/backend builds passed. Five existing accounts still require their initial password change before accessing modules; this security requirement was not bypassed.

Setup creates an insert-before-change snapshot under `backend/backups/performance-before-demo-*.json`. All inserts are transactional. Deterministic IDs prevent duplicate cycles/reviews. Setup does not send email, change accounts or run at server startup. There is no automatic reset/delete feature; preserve practice edits unless removal is explicitly requested.
