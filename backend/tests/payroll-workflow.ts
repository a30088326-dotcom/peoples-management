import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRules } from '../src/modules/payroll/calculation';
import { changeRun, saveInput, saveProfile, saveRules, viewPayroll } from '../src/modules/payroll/service';
import { withRepositoryForTests } from '../src/storage/repository';
import { employeeId, rosterFixture } from './roster-fixture';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PROVIDER = 'dynamodb';

test('monthly payroll blocks unreviewed inputs, detects changes, separates approval and retains approved amounts', async () => {
  const repo = await rosterFixture();
  const period = '2026-10';
  const profile = { employeeId, effectiveMonth: period, basic: 100_000, allowance: 10_000, loan: 2_000, enabled: true };
  await withRepositoryForTests(repo, async () => {
    await saveRules({ ...defaultRules, effectiveMonth: period });
    await saveProfile(profile);
    assert.equal((await viewPayroll(period)).rows.length, 1);
    await assert.rejects(changeRun(period, 'calculate', 0, 'maker'), /Resolve the items/);
    await assert.rejects(saveInput(period, { employeeId, service: 1000, otHours: 1, apit: 500, checked: true }), /cannot exceed/);
    await saveInput(period, { employeeId, service: 1000, otHours: 0, apit: 500, checked: true });
    const calculated = await changeRun(period, 'calculate', 0, 'maker');
    const submitted = await changeRun(period, 'submit', calculated.version, 'maker');
    await assert.rejects(changeRun(period, 'approve', submitted.version, 'maker'), /different payroll approver/);
    await saveProfile({ ...profile, basic: 120_000 });
    const stale = await viewPayroll(period);
    assert.equal(stale.status, 'draft');
    await assert.rejects(changeRun(period, 'approve', submitted.version, 'reviewer'), /inputs changed/);
    const fresh = await changeRun(period, 'calculate', submitted.version, 'maker');
    const review = await changeRun(period, 'submit', fresh.version, 'maker');
    await changeRun(period, 'approve', review.version, 'reviewer');
    const approved = await viewPayroll(period);
    assert.equal(approved.status, 'approved');
    assert.equal(approved.rows[0].amounts?.gross, 131_000);
    assert.equal(approved.rows[0].amounts?.net, 118_020);
    assert.equal(approved.rows[0].amounts?.employerCost, 150_650);
    await assert.rejects(saveProfile(profile), /approved and locked/);
    await saveProfile({ ...profile, effectiveMonth: '2026-11' });
    assert.deepEqual((await viewPayroll(period)).rows, approved.rows);
  });
});
