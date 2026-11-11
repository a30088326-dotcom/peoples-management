import { addDays, datesBetween, OFF, plannedDay, readPlan, shiftInterval, type Plan, type RosterRow } from './pattern';
import type { Reader, Row } from './store';

export const dateKey = (value: unknown) => String(value ?? '').slice(0, 10);
const covered = (row: Row, day: string) => dateKey(row.effectiveStartDate || row.effectiveFrom) <= day &&
  (!row.effectiveEndDate && !row.effectiveTo || dateKey(row.effectiveEndDate || row.effectiveTo) >= day);
const cellKey = (id: string, date: string) => `${id}:${date}`;
type ScheduledDay = { shiftId: string; source: 'pattern' | 'occurrence' | 'future' | 'legacy'; rosterId: string; rosterName: string; version: number; editable: boolean };
function byEmployee(rows: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const items = groups.get(row.employeeId) ?? [];
    items.push(row);
    groups.set(row.employeeId, items);
  }
  return groups;
}

export async function scheduleContext(reader: Reader, employeeIds: string[], from: string, to: string) {
  const employees = new Set(employeeIds);
  const start = addDays(from, -1);
  const end = addDays(to, 1);
  const inRange = (value: unknown) => dateKey(value) >= start && dateKey(value) <= end;
  const [rosters, links, calendars, shifts, assignments, attendance, leave, holidays, dayTypes, holidayCalendars] = await Promise.all([
    reader.list('attendance_roster_groups'), reader.list('attendance_roster_group_shifts'),
    reader.list('attendance_roster_calendars', row => inRange(row.date)), reader.list('attendance_shifts'),
    reader.list('attendance_roster_assignments', row => employees.has(row.employeeId) && row.status === 'Active' &&
      dateKey(row.effectiveStartDate || row.effectiveFrom) <= end &&
      (!row.effectiveEndDate && !row.effectiveTo || dateKey(row.effectiveEndDate || row.effectiveTo) >= start)),
    reader.list('attendance_records', row => employees.has(row.employeeId) && inRange(row.date)),
    reader.list('leave_applications', row => (!row.employeeId || employees.has(row.employeeId)) && String(row.status).toUpperCase() === 'APPROVED' &&
      dateKey(row.startDate) <= end && dateKey(row.endDate) >= start),
    reader.list('calendarday', row => inRange(row.date)), reader.list('daytype'), reader.list('holidaycalendar'),
  ]);
  const groups = new Map(rosters.map(row => [String(row.id), { row: row as RosterRow, plan: readPlan(row) }]));
  const shiftMap = new Map(shifts.map(row => [String(row.id), row]));
  const dayMap = new Map(calendars.map(row => [cellKey(row.rosterGroupId, dateKey(row.date)), row]));
  const defaults = new Map(links.filter(row => Number(row.isDefault) === 1).map(row => [row.groupId || row.rosterGroupId, String(row.shiftId)]));
  const employeeAssignments = byEmployee(assignments);
  const legacyLeave = leave.filter(row => !row.employeeId && row.applicantId);
  const applicantIds = new Set(legacyLeave.map(row => row.applicantId));
  const profiles = applicantIds.size ? await reader.list('employee_information_employees',
    row => employees.has(row.id) && applicantIds.has(row.userId)) : [];
  const profileByUser = new Map(profiles.map(row => [row.userId, row.id]));
  const employeeLeaves = byEmployee(leave.flatMap(row => {
    const employeeId = row.employeeId || profileByUser.get(row.applicantId);
    return employeeId ? [{ ...row, employeeId }] : [];
  }));
  const records = new Map(attendance.map(row => [cellKey(row.employeeId, dateKey(row.date)), row]));
  const types = new Map(dayTypes.map(type => [type.id, type]));
  const holidaySources = new Map(holidayCalendars.map(calendar => [calendar.id, calendar]));
  const holidayNames = new Map<string, string[]>();
  for (const day of holidays) {
    const calendar = holidaySources.get(day.holidayCalendarId);
    const type = types.get(day.dayTypeId);
    if (!calendar || (calendar.activeRevision ? calendar.activeRevision !== day.revision : day.revision) || !type ||
      !/(?:holiday|poya)/i.test(`${type.type} ${type.name}`)) continue;
    const names = holidayNames.get(dateKey(day.date)) || [];
    if (!names.includes(type.name)) names.push(type.name);
    holidayNames.set(dateKey(day.date), names);
  }

  function existing(employeeId: string, date: string, omit?: string) {
    return (employeeAssignments.get(employeeId) || []).flatMap<ScheduledDay>(assignment => {
      const id = String(assignment.groupId || assignment.rosterGroupId);
      if (id === omit || !covered(assignment, date)) return [];
      const roster = groups.get(id);
      if (!roster) return [];
      if (roster.plan) {
        if (roster.row.status !== 'Active') return [];
        const day = plannedDay(roster.plan, employeeId, date);
        return day ? [{ ...day, rosterId: id, rosterName: roster.row.name, version: roster.plan.version, editable: true }] : [];
      }
      const entry = dayMap.get(cellKey(id, date));
      const shiftId = Number(entry?.isOffDay) === 1 ? OFF : String(entry?.shiftId || defaults.get(id) || assignment.shiftId || '');
      return [{ shiftId, source: 'legacy' as const, rosterId: id, rosterName: roster.row.name, version: 0, editable: false }];
    });
  }

  const onLeave = (employeeId: string, date: string) => (employeeLeaves.get(employeeId) || [])
    .some(row => dateKey(row.startDate) <= date && dateKey(row.endDate) >= date);
  function lockReason(employeeId: string, date: string) {
    const row = records.get(cellKey(employeeId, date));
    return row ? Number(row.payrollLocked) === 1 || row.payrollLockedAt ? 'Payroll locked' : 'Attendance recorded' : undefined;
  }
  return { groups, shiftMap, holidayNames, existing, onLeave, lockReason };
}

export type ScheduleContext = Awaited<ReturnType<typeof scheduleContext>>;

export function dayIssues(context: ScheduleContext, plan: Plan, rosterId: string, employeeId: string, date: string, shiftId: string, previousShiftId?: string) {
  const issues: string[] = [];
  const locked = context.lockReason(employeeId, date);
  if (locked) issues.push(locked);
  const collisions = context.existing(employeeId, date, rosterId);
  if (collisions.length) issues.push(`Already scheduled in ${collisions[0].rosterName}`);
  if (shiftId !== OFF) {
    const shift = context.shiftMap.get(shiftId);
    const time = shiftInterval(date, shift);
    if (!time || shift?.status !== 'Active') issues.push('Shift unavailable or missing valid hours');
    if (context.onLeave(employeeId, date) || (time?.overnight && context.onLeave(employeeId, addDays(date, 1)))) issues.push('Approved leave overlaps this shift');
    if (time?.overnight && context.lockReason(employeeId, addDays(date, 1))) issues.push(`Next day: ${context.lockReason(employeeId, addDays(date, 1))}`);
    if (shift?.holidayRule === 'Off' && context.holidayNames.has(date)) issues.push('This shift is configured as off on holidays');
    if (time) for (const neighbor of [addDays(date, -1), addDays(date, 1)]) {
      const adjacent = [plannedDay(plan, employeeId, neighbor), ...context.existing(employeeId, neighbor, rosterId)];
      if (adjacent.some(day => {
        const other = day && shiftInterval(neighbor, context.shiftMap.get(day.shiftId));
        return other && other.start < time.end && time.start < other.end;
      })) issues.push(`Overlapping shift on ${neighbor}`);
    }
  }
  if (previousShiftId && previousShiftId !== OFF && shiftInterval(date, context.shiftMap.get(previousShiftId))?.overnight &&
    context.lockReason(employeeId, addDays(date, 1))) issues.push('The previous overnight shift runs into a locked date');
  return [...new Set(issues)];
}

export function planConflicts(context: ScheduleContext, id: string, plan: Plan, previous?: Plan, onlyEmployee?: string) {
  const conflicts: { employeeId: string; date: string; message: string }[] = [];
  for (const member of plan.employees) {
    if (onlyEmployee && member.employeeId !== onlyEmployee) continue;
    for (const date of datesBetween(plan.startDate, plan.endDate)) {
      const current = plannedDay(plan, member.employeeId, date)!;
      const before = previous && plannedDay(previous, member.employeeId, date);
      if (before?.shiftId === current.shiftId) continue;
      for (const message of dayIssues(context, plan, id, member.employeeId, date, current.shiftId, before?.shiftId)) {
        conflicts.push({ employeeId: member.employeeId, date, message });
        if (conflicts.length === 30) return conflicts;
      }
    }
  }
  return conflicts;
}
