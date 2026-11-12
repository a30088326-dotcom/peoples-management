import { directory } from '../../shared/services/organization.service';
import { dateKey, scheduleContext } from '../attendance/roster-planner/calendar';
import { addDays, datesBetween, OFF, shiftInterval } from '../attendance/roster-planner/pattern';
import type { Row } from '../attendance/roster-planner/store';
import { payrollAttendance, type PayrollLeaveDay } from './attendance';
import { calculate, type Amounts, type Input, type Profile, type Rules } from './calculation';
import type { PayrollStore } from './store';

export function monthRange(period: string) {
  const [year, month] = period.split('-').map(Number);
  return { from: period + '-01', to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) };
}
export function latest<T>(rows: { period: string; payload: unknown }[], period: string) {
  return rows.filter(row => row.period <= period).sort((a, b) => b.period.localeCompare(a.period))[0]?.payload as T | undefined;
}
const inactiveEmploymentStatuses = new Set(['inactive', 'resigned', 'retired', 'terminated', 'separated', 'dismissed', 'deceased', 'left']);
const byUpdate = (a: Row, b: Row) => String(a.updatedAt ?? a.createdAt ?? '').localeCompare(String(b.updatedAt ?? b.createdAt ?? '')) ||
  String(a.id).localeCompare(String(b.id));

export async function employeesFor(store: PayrollStore, period: string) {
  const { from, to } = monthRange(period);
  const [employees, rows, profiles, resignations, salaries] = await Promise.all([
    directory(), store.list('employee_information_employees'), store.records('profile'),
    store.list('employee_information_resignation_details'),
    store.list('employee_salary_histories', row => Boolean(row.effectiveDate) && dateKey(row.effectiveDate) <= from &&
      Number(row.basicSalary) > 0 && Number(row.basicSalary) <= 100_000_000 && /^[A-Z]{3}$/.test(String(row.currency).trim().toUpperCase())),
  ]);
  const byId = new Map(rows.map(row => [row.id, row]));
  const lastEmployment = new Map(resignations.sort(byUpdate).map(row => [row.employeeId, row]));
  const salaryHistory = new Map(salaries.sort((a, b) => dateKey(a.effectiveDate).localeCompare(dateKey(b.effectiveDate)) || byUpdate(a, b))
    .map(row => [row.employeeId, { basic: Number(row.basicSalary), currency: String(row.currency).trim().toUpperCase(),
      effectiveDate: dateKey(row.effectiveDate) }]));
  return employees.map(employee => {
    const row = byId.get(employee.id);
    const resignation = lastEmployment.get(employee.id);
    const joined = dateKey(row?.dateJoined);
    const exitDate = dateKey(resignation?.dateOfRetirement || resignation?.dateResigned);
    const ended = exitDate >= joined ? exitDate : '';
    const active = employee.active && !inactiveEmploymentStatuses.has(String(row?.employeeStatus).trim().toLowerCase());
    const profile = latest<Profile>(profiles.filter(record => record.employeeId === employee.id), period);
    return { id: employee.id, name: employee.name, employeeNumber: employee.employeeNumber, department: employee.department,
      designation: employee.designation, profile: profile ?? null, salaryHistory: salaryHistory.get(employee.id),
      active: active || Boolean(ended && ended >= from),
      eligible: Number(row?.payrollActive ?? 1) === 1 && (!joined || joined <= to) && (!ended || ended >= from),
      partialMonth: Boolean(joined && joined > from || ended && ended < to), userId: employee.userId };
  }).filter(employee => employee.active && employee.eligible).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export type PayrollLine = {
  employeeId: string; name: string; employeeNumber: string; department: string; designation: string;
  profile: Profile; input: Input; rosterDays: number; paidDays: number; unpaidDays: number;
  workedHours: number; paidHours?: number; recordedOt: number; issues: string[]; amounts: Amounts | null;
};

export async function prepareInputs(store: PayrollStore, period: string, rules: Rules | undefined) {
  const { from, to } = monthRange(period);
  const employees = await employeesFor(store, period);
  const selected = employees.filter(employee => employee.profile?.enabled);
  const directory = employees.map(({ userId, ...employee }) => employee);
  if (!selected.length) return { employees: directory, rows: [] as PayrollLine[] };
  const ids = new Set(selected.map(employee => employee.id));
  const lookbehind = addDays(from, -1), lookahead = addDays(to, 1);
  const adjacentDate = (value: unknown) => dateKey(value) >= lookbehind && dateKey(value) <= lookahead;
  const [savedInputs, schedule, attendance, punches, leave, leaveTypes, exceptions] = await Promise.all([
    store.records('input'), scheduleContext(store, [...ids], from, to),
    store.list('attendance_records', row => ids.has(row.employeeId) && adjacentDate(row.date)),
    store.punches(ids, lookbehind, addDays(lookahead, 1)),
    store.list('leave_applications', row => String(row.status).toUpperCase() === 'APPROVED' && dateKey(row.startDate) <= to && dateKey(row.endDate) >= from),
    store.list('leave_types'),
    store.list('attendance_exceptions', row => ids.has(row.employeeId) && dateKey(row.date) >= from && dateKey(row.date) <= to &&
      String(row.status).toUpperCase() === 'PENDING'),
  ]);
  const dates = datesBetween(from, to);
  const types = new Map(leaveTypes.map(type => [type.id, type]));
  const rows: PayrollLine[] = selected.map(employee => {
    const profile = employee.profile!;
    const saved = savedInputs.find(row => row.period === period && row.employeeId === employee.id);
    const input = saved?.payload as Input | undefined ?? { employeeId: employee.id, service: 0, otHours: 0, apit: null, checked: false };
    const entries = attendance.filter(row => row.employeeId === employee.id);
    const issues = new Set<string>();
    const leaveByDay = new Map<string, PayrollLeaveDay>();
    const leaveRows = leave.filter(row => row.employeeId === employee.id || !row.employeeId && employee.userId && row.applicantId === employee.userId);
    const workdays = new Set(dates.filter(date => {
      const day = schedule?.existing(employee.id, date) || [];
      if (!day.length || day[0].shiftId === OFF) return false;
      const shift = schedule?.shiftMap.get(day[0].shiftId);
      return Boolean(shiftInterval(date, shift)) &&
        !(String(shift?.holidayRule).toLowerCase() === 'off' && schedule?.holidayNames.has(date));
    }));
    let unpaidDays = 0, paidDays = 0;
    for (const day of workdays) {
      const leaveForDay = leaveRows.filter(row => dateKey(row.startDate) <= day && dateKey(row.endDate) >= day);
      if (leaveForDay.length > 1) issues.add('Overlapping approved leave');
      const application = leaveForDay[0];
      if (!application) continue;
      const type = types.get(application.leaveTypeId);
      if (!type) { issues.add('An approved leave request has an unknown leave type'); continue; }
      const half = application.halfDayType === 'FIRST_HALF' || application.halfDayType === 'SECOND_HALF'
        ? application.halfDayType : undefined;
      const fraction = half ? 0.5 : 1;
      const paid = !Number(type.isNoPayLeave);
      leaveByDay.set(day, { paid, fraction, half });
      if (!paid) unpaidDays += fraction;
      else paidDays += fraction;
    }
    if (leaveRows.some(row => Number(types.get(row.leaveTypeId)?.isNoPayLeave) && !dates.some(date =>
      dateKey(row.startDate) <= date && dateKey(row.endDate) >= date && schedule?.existing(employee.id, date).length))) {
      issues.add('Approved unpaid leave is missing roster coverage');
    }
    if (employee.partialMonth) issues.add('Joiner or leaver needs a separately verified payroll calculation');
    if (exceptions.some(row => row.employeeId === employee.id)) issues.add('Pending attendance exception');
    const employeePunches = punches.filter(row => row.employeeId === employee.id)
      .map(row => ({ id: row.id, timestamp: row.timestamp, logType: row.logType || row.direction }));
    const { workedHours, paidHours, recordedOt, issues: attendanceIssues } =
      payrollAttendance(employee.id, dates, schedule, entries, employeePunches, leaveByDay);
    for (const issue of attendanceIssues) issues.add(issue);
    if (!input.checked) issues.add('Review attendance, overtime and service charge');
    if (input.otHours > recordedOt) issues.add('Approved overtime exceeds recorded overtime');
    if (rules?.taxMode === 'verified-input' && input.apit === null) issues.add('Enter the verified APIT amount');
    let amounts: Amounts | null = null;
    if (rules) {
      try { amounts = calculate(profile, rules, input, workdays.size, unpaidDays); }
      catch { issues.add('Unpaid leave does not match the working-day divisor'); }
      if (amounts && amounts.net < 0) issues.add('Deductions exceed gross pay');
    }
    return { employeeId: employee.id, name: employee.name, employeeNumber: employee.employeeNumber, department: employee.department,
      designation: employee.designation, profile, input, rosterDays: workdays.size, paidDays, unpaidDays, workedHours, paidHours, recordedOt, issues: [...issues], amounts };
  });
  return { employees: directory, rows };
}
