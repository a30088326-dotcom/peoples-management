import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OFF } from '../src/modules/attendance/roster-planner/pattern';
import { publishRoster, saveDraft } from '../src/modules/attendance/roster-planner/service';
import { defaultRules } from '../src/modules/payroll/calculation';
import { changeRun, saveInput, saveProfile, saveRules, viewPayroll } from '../src/modules/payroll/service';
import { withRepositoryForTests } from '../src/storage/repository';
import { adminId, dayId, employeeId, nightId, rosterFixture } from './roster-fixture';

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

test('monthly attendance uses the published shift, grace and breaks across the payroll boundary', async () => {
  const repo = await rosterFixture();
  const period = '2027-01';
  await withRepositoryForTests(repo, async () => {
    const day = (await repo.get('attendance_shifts', { id: dayId }))!;
    const night = (await repo.get('attendance_shifts', { id: nightId }))!;
    await repo.replace('attendance_shifts', { ...day, graceLate: 5, graceEarly: 3, breakDuration: 0.5,
      breakType: 'Unpaid', overtimeEligible: 1, overtimeStart: 15 });
    await repo.replace('attendance_shifts', { ...night, graceLate: 5, overtimeEligible: 1, overtimeStart: 15 });
    const draft = await saveDraft(adminId, {
      name: 'Monthly payroll test roster', startDate: '2026-12-28', endDate: '2027-02-07', repeat: 'weekly',
      employees: [{ employeeId, shifts: [dayId, OFF, OFF, nightId, dayId, OFF, nightId] }],
    });
    await publishRoster(adminId, draft.id, draft.version);
    await saveRules({ ...defaultRules, effectiveMonth: period });
    await saveProfile({ employeeId, effectiveMonth: period, basic: 100_000, allowance: 0, loan: 0, enabled: true });
    await repo.create('attendance_records', { id: 'stale-attendance-total', employeeId, date: '2027-01-01',
      shiftId: nightId, inTime: '2027-01-01 09:05:00', outTime: '2027-01-01 16:57:00',
      totalHours: 99, overtimeHours: 9, status: 'Present' });
    const punches = [
      ['2026-12-31 21:00:00', 'In'], ['2027-01-01 06:30:00', 'Out'],
      ['2027-01-01 09:05:00', 'In'], ['2027-01-01 16:57:00', 'Out'],
      ['2027-01-04 09:12:00', 'In'], ['2027-01-04 12:00:00', 'BreakIn'],
      ['2027-01-04 12:30:00', 'BreakOut'], ['2027-01-04 17:20:00', 'Out'],
      ['2027-01-31 21:03:00', 'In'], ['2027-02-01 06:30:00', 'Out'],
    ];
    for (const [index, [timestamp, direction]] of punches.entries()) {
      await repo.create('attendance_raw_logs', { id: 'payroll-punch-' + index, employeeId, timestamp, direction });
    }
    const line = (await viewPayroll(period)).rows[0];
    assert.equal(line.workedHours, 24.95);
    assert.equal(line.paidHours, 23.8);
    assert.equal(line.recordedOt, 0.83);
    assert.equal((await viewPayroll('2027-02')).rows[0].workedHours, 0);
    await assert.rejects(saveInput(period, { employeeId, service: 0, otHours: 0.84, apit: 0, checked: true }), /cannot exceed/);
    await saveInput(period, { employeeId, service: 0, otHours: 0.83, apit: 0, checked: true });
    const calculated = await changeRun(period, 'calculate', 0, 'maker');

    await repo.create('attendance_records', { id: 'approved-attendance-correction', employeeId, date: '2027-01-04',
      inTime: '2027-01-04 09:00:00', outTime: '2027-01-04 17:10:00', status: 'APPROVED' });
    const corrected = await viewPayroll(period);
    assert.equal(corrected.stale, true);
    assert.equal(corrected.rows[0].workedHours, 24.98);
    assert.equal(corrected.rows[0].paidHours, 24);
    assert.equal(corrected.rows[0].recordedOt, 0.5);
    await assert.rejects(changeRun(period, 'submit', calculated.version, 'maker'), /Resolve the items/);
    await saveInput(period, { employeeId, service: 0, otHours: 0.5, apit: 0, checked: true });
    assert.equal((await viewPayroll(period)).rows[0].amounts?.overtime, 360.58);
  });
});

test('legacy in/out records supply verified hours and an unpaired punch blocks payroll', async () => {
  const repo = await rosterFixture();
  const period = '2027-02';
  await withRepositoryForTests(repo, async () => {
    await saveRules({ ...defaultRules, effectiveMonth: period });
    await saveProfile({ employeeId, effectiveMonth: period, basic: 100_000, allowance: 0, loan: 0, enabled: true });
    await repo.create('attendance_records', { id: 'legacy-hours', employeeId, date: '2027-02-01', shiftId: dayId,
      inTime: '2027-02-01 09:00:00', outTime: '2027-02-01 17:00:00', status: 'Present' });
    await saveInput(period, { employeeId, service: 0, otHours: 0, apit: 0, checked: true });
    const initial = (await viewPayroll(period)).rows[0];
    assert.equal(initial.workedHours, 8);
    assert.equal(initial.paidHours, 8);
    assert.deepEqual(initial.issues, []);
    const record = (await repo.get('attendance_records', { id: 'legacy-hours' }))!;
    await repo.replace('attendance_records', { ...record, isException: 1 });
    await repo.create('attendance_raw_logs', { id: 'original-in', employeeId, timestamp: '2027-02-01 10:00:00', logType: 'In' });
    await repo.create('attendance_raw_logs', { id: 'original-out', employeeId, timestamp: '2027-02-01 17:00:00', logType: 'Out' });
    assert.equal((await viewPayroll(period)).rows[0].workedHours, 8);
    await repo.create('attendance_raw_logs', { id: 'unpaired-punch', employeeId, timestamp: '2027-02-02 09:00:00', logType: 'In' });
    assert.match((await viewPayroll(period)).rows[0].issues.join(' '), /no matching clock-out/);
    await assert.rejects(changeRun(period, 'calculate', 0, 'maker'), /Resolve the items/);
  });
});

test('employee exit details and effective salary history are mapped into the monthly workspace', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const employee = (await repo.get('employee_information_employees', { id: employeeId }))!;
    await repo.replace('employee_information_employees', { ...employee, status: 'Inactive', employeeStatus: 'Resigned', isActive: 0 });
    await repo.create('employee_information_resignation_details', { id: 'latest-exit', employeeId,
      dateResigned: '2027-01-27', dateOfRetirement: '2027-02-15' });
    for (const [effectiveDate, basicSalary] of [['2026-12-01', 80_000], ['2027-02-01', 90_000], ['2027-02-15', 100_000]] as const) {
      await repo.create('employee_salary_histories', { id: 'salary-' + effectiveDate, employeeId, effectiveDate, basicSalary, currency: 'lkr' });
    }
    const february = await viewPayroll('2027-02');
    const row = february.employees.find(item => item.id === employeeId)!;
    assert.equal(row.partialMonth, true);
    assert.equal(row.profile, null);
    assert.deepEqual(row.salaryHistory, { basic: 90_000, currency: 'LKR', effectiveDate: '2027-02-01' });
    assert.equal(february.rows.length, 0);
    assert.equal((await viewPayroll('2027-03')).employees.some(item => item.id === employeeId), false);

    const resigned = (await repo.get('employee_information_employees', { id: employeeId }))!;
    await repo.replace('employee_information_employees', { ...resigned, status: 'Active', employeeStatus: 'Active',
      isActive: 1, dateJoined: '2027-04-01' });
    assert.equal((await viewPayroll('2027-04')).employees.some(item => item.id === employeeId), true);
  });
});
