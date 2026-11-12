import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shiftForDate } from '../src/modules/attendance/calculation.service';
import { assignRoster } from '../src/modules/attendance/roster.service';
import { addDays, draftSchema, OFF, plannedDay, type Draft, type Plan } from '../src/modules/attendance/roster-planner/pattern';
import { changePublishedShift, deleteRosterDraft, publishRoster, rosterCalendar, rosterDetail, rosterOptions, saveDraft } from '../src/modules/attendance/roster-planner/service';
import { RosterError } from '../src/modules/attendance/roster-validation';
import { payrollWrite } from '../src/modules/payroll/store';
import { withRepositoryForTests } from '../src/storage/repository';
import { adminId, dayId, earlyId, employeeId, eveningId, nightId, rosterFixture, serverId } from './roster-fixture';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PROVIDER = 'dynamodb';

const monday = '2027-01-04';
const weekly: Draft = {
  name: 'Restaurant roster', repeat: 'weekly', startDate: monday, endDate: '2027-01-31',
  employees: [{ employeeId, shifts: [dayId, OFF, dayId, OFF, nightId, OFF, OFF] }],
};
const firstShift = (plan: Plan, date: string) => plannedDay(plan, employeeId, date)?.shiftId;

function conflicts(message: RegExp) {
  return (error: unknown) => error instanceof RosterError && error.status === 409 &&
    Array.isArray(error.details) && error.details.some(issue => message.test(issue.message));
}

test('validates roster input and generates weekly, two-week and calendar-day patterns', () => {
  const plan = { ...draftSchema.parse(weekly), version: 1, exceptions: [] };
  assert.equal(firstShift(plan, monday), dayId);
  assert.equal(firstShift(plan, addDays(monday, 7)), dayId);
  assert.equal(firstShift(plan, '2027-02-01'), undefined);
  const biweekly = { ...plan, repeat: 'biweekly' as const, employees: [
    { employeeId, shifts: [...weekly.employees[0].shifts, ...Array(7).fill(eveningId)] },
  ] };
  assert.equal(firstShift(biweekly, addDays(monday, 7)), eveningId);
  assert.equal(firstShift(biweekly, addDays(monday, 14)), dayId);
  const monthly = { ...plan, repeat: 'monthly' as const, endDate: '2027-03-31',
    employees: [{ employeeId, shifts: [...Array(30).fill(OFF), nightId] }] };
  assert.equal(firstShift(monthly, '2027-01-31'), nightId);
  assert.equal(firstShift(monthly, '2027-02-28'), OFF);
  assert.equal(firstShift(monthly, '2027-03-31'), nightId);
  assert.equal(draftSchema.safeParse({ ...weekly, repeat: 'none' }).success, false);
  assert.equal(draftSchema.safeParse({ ...weekly, endDate: '2026-12-31' }).success, false);
  assert.equal(draftSchema.safeParse({ ...weekly, name: ' ' }).success, false);
  assert.equal(draftSchema.safeParse({ ...weekly, startDate: '2027-02-29' }).success, false);
  assert.equal(draftSchema.safeParse({ ...weekly, employees: [...weekly.employees, ...weekly.employees] }).success, false);
});

test('preview is separate from active attendance and publishing retains one assignment per employee', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const draft = await saveDraft(adminId, { ...weekly, employees: [
      ...weekly.employees, { employeeId: serverId, shifts: Array(7).fill(eveningId) },
    ] });
    assert.equal(await shiftForDate(repo, employeeId, monday), null);
    const preview = await rosterCalendar(adminId, { from: monday, to: addDays(monday, 6), rosterId: draft.id });
    assert.equal(preview.preview, true);
    assert.equal(preview.employees.length, 2);
    const published = await publishRoster(adminId, draft.id, draft.version);
    assert.equal((await shiftForDate(repo, employeeId, monday)).id, dayId);
    assert.equal(await shiftForDate(repo, employeeId, addDays(monday, 1)), null);
    assert.equal((await shiftForDate(repo, employeeId, addDays(monday, 4))).id, nightId);
    assert.equal((await repo.find('attendance_roster_assignments', row => row.groupId === draft.id)).length, 2);
    await assert.rejects(publishRoster(adminId, draft.id, published.version), /already published/);
    const before = await rosterCalendar(adminId, { from: monday, to: monday, departmentId: 'kitchen', rosterId: draft.id });
    assert.equal(before.employees[0].id, employeeId);
    const employee = (await repo.get('employee_information_employees', { id: employeeId }))!;
    await repo.replace('employee_information_employees', { ...employee, departmentId: 'service' });
    const after = await rosterCalendar(adminId, { from: monday, to: monday, departmentId: 'service', rosterId: draft.id });
    assert.deepEqual(after.employees.map(row => row.id).sort(), [employeeId, serverId].sort());
  });
});

test('deleting an unused draft checks its version and keeps published assignments', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const saved = await saveDraft(adminId, { ...weekly, employees: [
      ...weekly.employees, { employeeId: serverId, shifts: Array(7).fill(eveningId) },
    ] });
    const edited = await saveDraft(adminId, { ...weekly, employees: [{ employeeId, shifts: Array(7).fill(eveningId) }] }, saved);
    const plan = await rosterDetail(adminId, saved.id);
    assert.deepEqual(plan.employees.map(member => member.employeeId), [employeeId]);
    assert.equal(firstShift(plan, monday), eveningId);
    await assert.rejects(deleteRosterDraft(adminId, saved.id, saved.version), /changed elsewhere/);
    assert.deepEqual(await deleteRosterDraft(adminId, saved.id, edited.version), { id: saved.id });
    await assert.rejects(rosterDetail(adminId, saved.id), /not found/);

    const next = await saveDraft(adminId, weekly);
    const published = await publishRoster(adminId, next.id, next.version);
    await assert.rejects(deleteRosterDraft(adminId, next.id, published.version), /Published rosters/);
    assert.equal((await repo.find('attendance_roster_assignments', row => row.groupId === next.id)).length, 1);
  });
});

test('approved payroll locks scheduled dates even with no attendance record', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const saved = await saveDraft(adminId, { ...weekly, endDate: '2027-02-07', employees: [
      ...weekly.employees, { employeeId: serverId, shifts: Array(7).fill(eveningId) },
    ] });
    const published = await publishRoster(adminId, saved.id, saved.version);
    await repo.create('payroll_records', { id: 'run:2027-01', kind: 'run', period: '2027-01',
      payload: { status: 'approved', rows: [{ employeeId }] } });
    await repo.create('payroll_records', { id: 'run:2027-02', kind: 'run', period: '2027-02',
      payload: { status: 'submitted', rows: [{ employeeId }] } });
    const calendar = await rosterCalendar(adminId, { from: '2027-01-31', to: '2027-02-01', rosterId: saved.id });
    assert.deepEqual(calendar.employees.find(employee => employee.id === employeeId)?.cells.map(cell => cell.lock),
      ['Payroll locked', undefined]);
    assert.equal(calendar.employees.find(employee => employee.id === serverId)?.cells[0].lock, undefined);
    await assert.rejects(changePublishedShift(adminId, saved.id, {
      employeeId, date: monday, shiftId: OFF, scope: 'occurrence', version: published.version,
    }), conflicts(/Payroll locked/));
    const next = await changePublishedShift(adminId, saved.id, {
      employeeId, date: '2027-02-01', shiftId: OFF, scope: 'occurrence', version: published.version,
    });
    assert.equal(next.version, published.version + 1);
  });
});

test('an in-flight payroll approval must refresh after a published shift changes', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const saved = await saveDraft(adminId, weekly);
    const published = await publishRoster(adminId, saved.id, saved.version);
    let ready!: () => void;
    let resume!: () => void;
    const reading = new Promise<void>(resolve => { ready = resolve; });
    const resumeApproval = new Promise<void>(resolve => { resume = resolve; });
    const approval = payrollWrite(async store => {
      ready();
      await resumeApproval;
      await store.put({ id: 'run:2027-01', kind: 'run', period: '2027-01', payload: { status: 'approved', rows: [{ employeeId }] } });
    });
    const started = await Promise.race([reading.then(() => true), approval.then(() => false)]);
    assert.equal(started, true);
    try {
      await changePublishedShift(adminId, saved.id, {
        employeeId, date: monday, shiftId: eveningId, scope: 'occurrence', version: published.version,
      });
    } finally { resume(); }
    await assert.rejects(approval, { name: 'StorageConflictError' });
    assert.equal(await repo.get('payroll_records', { id: 'run:2027-01' }), undefined);
  });
});

test('a legacy assignment versions the parent roster before an in-flight deletion can commit', async () => {
  const repo = await rosterFixture();
  const groupId = 'legacy';
  await repo.create('attendance_roster_groups', { id: groupId, name: 'Legacy roster', code: 'LEG', status: 'Active' });
  await repo.create('attendance_roster_group_shifts', { id: 'legacy-default', groupId, shiftId: dayId, isDefault: 1 });
  let ready!: () => void;
  let resume!: () => void;
  const reading = new Promise<void>(resolve => { ready = resolve; });
  const resumeDeletion = new Promise<void>(resolve => { resume = resolve; });
  const deletion = repo.transaction(async tx => {
    const roster = await tx.get('attendance_roster_groups', { id: groupId });
    assert.ok(roster);
    assert.equal((await tx.find('attendance_roster_assignments', row => row.groupId === groupId)).length, 0);
    ready();
    await resumeDeletion;
    await tx.remove('attendance_roster_groups', { id: groupId }, roster._version);
  });
  const started = await Promise.race([reading.then(() => true), deletion.then(() => false)]);
  assert.equal(started, true);
  try {
    await repo.transaction(tx => assignRoster(tx, employeeId, groupId, monday));
  } finally { resume(); }
  await assert.rejects(deletion, { name: 'StorageConflictError' });
  assert.ok(await repo.get('attendance_roster_groups', { id: groupId }));
  assert.equal((await repo.find('attendance_roster_assignments', row => row.groupId === groupId)).length, 1);
});

test('publishing overlapping rosters concurrently activates only one, and legacy assignment honors the conflict', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const a = await saveDraft(adminId, weekly);
    const b = await saveDraft(adminId, { ...weekly, name: 'Duplicate roster' });
    const outcomes = await Promise.allSettled([a, b].map(draft => publishRoster(adminId, draft.id, draft.version)));
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    const active = await repo.find('attendance_roster_assignments', row => row.employeeId === employeeId && row.status === 'Active');
    assert.equal(active.length, 1);
    const duplicate = active[0].groupId === a.id ? b : a;
    await assert.rejects(publishRoster(adminId, duplicate.id, duplicate.version), conflicts(/Already scheduled/));
    await repo.create('attendance_roster_groups', { id: 'legacy', name: 'Legacy roster', code: 'LEG', status: 'Active' });
    await repo.create('attendance_roster_group_shifts', { id: 'legacy-default', groupId: 'legacy', shiftId: dayId, isDefault: 1 });
    await assert.rejects(repo.transaction(tx => assignRoster(tx, employeeId, 'legacy', monday)), /published roster/);
    assert.equal((await repo.find('attendance_roster_assignments', row => row.employeeId === employeeId)).length, 1);
  });
});

test('published exceptions affect only their scope and protect attendance and payroll', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const saved = await saveDraft(adminId, weekly);
    const published = await publishRoster(adminId, saved.id, saved.version);
    const update = (date: string, shiftId: string, scope: 'occurrence' | 'future' | 'pattern', version: number) =>
      changePublishedShift(adminId, saved.id, { employeeId, date, shiftId, scope, version });
    const one = await update(addDays(monday, 7), OFF, 'occurrence', published.version);
    assert.equal(firstShift(await rosterDetail(adminId, saved.id), addDays(monday, 7)), OFF);
    assert.equal(firstShift(await rosterDetail(adminId, saved.id), addDays(monday, 14)), dayId);
    const future = await update(addDays(monday, 7), eveningId, 'future', one.version);
    const plan = await rosterDetail(adminId, saved.id);
    assert.equal(firstShift(plan, monday), dayId);
    assert.equal(firstShift(plan, addDays(monday, 7)), eveningId);
    assert.equal(firstShift(plan, addDays(monday, 14)), eveningId);
    await assert.rejects(update(monday, OFF, 'occurrence', published.version), /changed elsewhere/);
    await repo.create('attendance_records', { id: 'locked-record', employeeId, date: monday, status: 'Present', payrollLocked: 1 });
    await assert.rejects(update(addDays(monday, 7), OFF, 'pattern', future.version), conflicts(/Payroll locked/));
    const whole = await update(addDays(monday, 8), eveningId, 'pattern', future.version);
    assert.equal(firstShift(await rosterDetail(adminId, saved.id), addDays(monday, 1)), eveningId);
    assert.equal(firstShift(await rosterDetail(adminId, saved.id), addDays(monday, 15)), eveningId);
    assert.equal(whole.version, future.version + 1);
    assert.equal((await repo.get('attendance_records', { id: 'locked-record' }))?._version, 1);
  });
});

test('rejects missing shifts, overnight overlaps, approved leave and configured holidays before publishing', async () => {
  const repo = await rosterFixture();
  await withRepositoryForTests(repo, async () => {
    const schedule = (shifts: string[]): Draft => ({ ...weekly, employees: [{ employeeId, shifts }] });
    await assert.rejects(saveDraft(adminId, schedule(['missing', OFF, OFF, OFF, OFF, OFF, OFF])), /missing/);
    const overlapping = await saveDraft(adminId, schedule([nightId, earlyId, OFF, OFF, OFF, OFF, OFF]));
    await assert.rejects(publishRoster(adminId, overlapping.id, overlapping.version), conflicts(/Overlapping shift/));
    const employee = (await repo.get('employee_information_employees', { id: employeeId }))!;
    await repo.replace('employee_information_employees', { ...employee, userId: 'leave-applicant' });
    await repo.create('leave_applications', { id: 'roster-test-leave', applicantId: 'leave-applicant', status: 'APPROVED',
      startDate: addDays(monday, 1), endDate: addDays(monday, 1) });
    const overnight = await saveDraft(adminId, schedule([nightId, OFF, OFF, OFF, OFF, OFF, OFF]));
    await assert.rejects(publishRoster(adminId, overnight.id, overnight.version), conflicts(/Approved leave/));
    await repo.create('holidaycalendar', { id: 'test-calendar', name: 'Public holidays' });
    await repo.create('daytype', { id: 'public-holiday', name: 'Public Holiday', type: 'Holiday' });
    await repo.create('calendarday', { id: 'test-holiday', holidayCalendarId: 'test-calendar', dayTypeId: 'public-holiday', date: monday });
    const holiday = await saveDraft(adminId, schedule([earlyId, OFF, OFF, OFF, OFF, OFF, OFF]));
    await assert.rejects(publishRoster(adminId, holiday.id, holiday.version), conflicts(/off on holidays/));
    assert.equal((await repo.find('attendance_roster_assignments', () => true)).length, 0);
  });
});

test('configured attendance scope limits an admin to permitted employees', async () => {
  const repo = await rosterFixture();
  const scopedAdmin = 'scoped-roster-admin';
  await repo.create('users', { id: scopedAdmin, email: 'scoped@example.test', role: 'ADMIN', isActive: 1 });
  const employee = (await repo.get('employee_information_employees', { id: employeeId }))!;
  await repo.replace('employee_information_employees', { ...employee, userId: scopedAdmin });
  await repo.create('user_module_permissions', { id: 'roster-own-permission', userId: scopedAdmin,
    moduleId: 'attendance_management', moduleAccess: 1, canView: 1, canCreate: 1, dataScope: 'OWN' });
  await withRepositoryForTests(repo, async () => {
    assert.deepEqual((await rosterOptions(scopedAdmin)).employees.map(row => row.id), [employeeId]);
    await assert.rejects(saveDraft(scopedAdmin, { ...weekly,
      employees: [{ employeeId: serverId, shifts: Array(7).fill(dayId) }] }),
    (error: unknown) => error instanceof RosterError && error.status === 403);
  });
});
