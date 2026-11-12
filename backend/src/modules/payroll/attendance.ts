import { dateKey, type ScheduleContext } from '../attendance/roster-planner/calendar';
import { OFF, shiftInterval } from '../attendance/roster-planner/pattern';
import type { Row } from '../attendance/roster-planner/store';
import { readPayrollPunches, type PayrollPunch, type PunchDay } from './payroll-punches';
import { daySeconds, timestamp, type Interval } from './payroll-time';

export type PayrollLeaveDay = { paid: boolean; fraction: number; half?: 'FIRST_HALF' | 'SECOND_HALF' };
type PayrollDaySchedule = { shift?: Row; window: Interval | null; off: boolean; issues: string[] };

function durationSeconds(value: unknown, secondsPerUnit: number) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * secondsPerUnit) : 0;
}

function attendanceForDay(records: Row[], raw?: PunchDay): PunchDay | undefined {
  const correction = records.find(record => String(record.status).toUpperCase() === 'APPROVED' || Number(record.isException) === 1);
  if (raw && !correction) return raw;
  const record = correction ?? records[0];
  if (!record?.inTime && !record?.outTime) return undefined;
  const start = timestamp(record.inTime);
  const end = timestamp(record.outTime);
  if (start == null || end == null || end <= start || end - start > daySeconds) {
    return { first: start, last: end, worked: [], breaks: [], issues: ['Missing punch or invalid worked duration'] };
  }

  const withinCorrection = (interval: Interval): Interval[] => {
    const clipped = { start: Math.max(start, interval.start), end: Math.min(end, interval.end) };
    return clipped.start < clipped.end ? [clipped] : [];
  };
  const breaks = raw?.breaks.flatMap(withinCorrection) ?? [];
  const interruptions = [...breaks];
  // Corrected first/last punches preserve breaks and gaps between clocked sessions.
  const clocked = raw ? [...raw.worked, ...raw.breaks].sort((a, b) => a.start - b.start) : [];
  let lastSegmentEnd = clocked[0]?.end;
  for (const interval of clocked.slice(1)) {
    if (interval.start > lastSegmentEnd) {
      interruptions.push(...withinCorrection({ start: lastSegmentEnd, end: interval.start }));
    }
    lastSegmentEnd = Math.max(lastSegmentEnd, interval.end);
  }
  const worked: Interval[] = [];
  let workingFrom = start;
  for (const interval of interruptions.sort((a, b) => a.start - b.start)) {
    if (interval.start > workingFrom) worked.push({ start: workingFrom, end: interval.start });
    workingFrom = Math.max(workingFrom, interval.end);
  }
  if (end > workingFrom) worked.push({ start: workingFrom, end });
  return { first: start, last: end, worked, breaks, issues: [] };
}

function overlap(intervals: Interval[], start: number, end: number) {
  return intervals.reduce((total, interval) => total + Math.max(0, Math.min(interval.end, end) - Math.max(interval.start, start)), 0);
}

function payForDay(schedule: PayrollDaySchedule, attendance: PunchDay | undefined, leave: PayrollLeaveDay | undefined,
  issues: Set<string>) {
  const { window, shift } = schedule;
  if (!window || !shift) return { paid: 0, overtime: 0 };
  const paidBreak = String(shift.breakType).toLowerCase() === 'paid';
  const unpaidBreak = paidBreak ? 0 : durationSeconds(shift.breakDuration, 3600);
  const scheduled = Math.max(0, window.end - window.start - unpaidBreak);
  const leaveSeconds = Math.round(scheduled * (leave?.fraction ?? 0));
  const paidLeave = leave?.paid ? leaveSeconds : 0;
  if (!attendance) return { paid: paidLeave, overtime: 0 };
  if (leave?.fraction === 1) {
    issues.add('Attendance conflicts with approved full-day leave');
    return { paid: 0, overtime: 0 };
  }
  const { first, last } = attendance;
  if (first == null || last == null || first >= last) return { paid: 0, overtime: 0 };
  if (last <= window.start || first >= window.end) {
    issues.add('Attendance falls outside the assigned shift');
    return { paid: 0, overtime: 0 };
  }
  let workingWindow = window;
  if (leave?.half) {
    const middle = window.start + Math.floor((window.end - window.start) / 2);
    const firstHalf = { start: window.start, end: middle };
    const secondHalf = { start: middle, end: window.end };
    const leaveWindow = leave.half === 'FIRST_HALF' ? firstHalf : secondHalf;
    workingWindow = leave.half === 'FIRST_HALF' ? secondHalf : firstHalf;
    if (overlap(attendance.worked, leaveWindow.start, leaveWindow.end) > 0) {
      issues.add('Attendance overlaps approved half-day leave');
    }
  }

  const paidIntervals = paidBreak ? [...attendance.worked, ...attendance.breaks] : attendance.worked;
  const regular = overlap(paidIntervals, workingWindow.start, workingWindow.end);
  const late = Math.max(0, first - workingWindow.start);
  const early = Math.max(0, workingWindow.end - last);
  const grace = (late <= durationSeconds(shift.graceLate, 60) ? late : 0) +
    (early <= durationSeconds(shift.graceEarly, 60) ? early : 0);
  const workingPortion = scheduled - leaveSeconds;
  // Explicit breaks and gaps between separately clocked sessions already reduce payable time.
  const breakDeduction = attendance.breaks.length || attendance.worked.length > 1 ? 0 :
    leave?.half ? Math.min(unpaidBreak, Math.max(0, regular + grace - workingPortion)) : unpaidBreak;
  const paid = Math.max(0, regular + grace - breakDeduction);
  if (leave?.half && paid > workingPortion) issues.add('Attendance exceeds the working portion of approved half-day leave');
  const overtime = Number(shift.overtimeEligible) === 1 && last - window.end >= durationSeconds(shift.overtimeStart, 60)
    ? overlap(paidIntervals, window.end, last) : 0;
  return { paid: paid + paidLeave, overtime };
}

export function payrollAttendance(employeeId: string, dates: string[], calendar: ScheduleContext,
  records: Row[], punches: PayrollPunch[], leave: Map<string, PayrollLeaveDay>) {
  const byDate = new Map<string, Row[]>();
  for (const record of records) {
    const date = dateKey(record.date);
    const day = byDate.get(date) ?? [];
    day.push(record);
    byDate.set(date, day);
  }
  const schedules = new Map<string, PayrollDaySchedule>();
  function scheduleFor(date: string): PayrollDaySchedule {
    const cached = schedules.get(date);
    if (cached) return cached;
    const scheduled = calendar.existing(employeeId, date);
    const issues: string[] = [];
    if (scheduled.length > 1) issues.push('Overlapping roster assignments');
    // Published assignments take priority. Older attendance records can carry their own historical shift.
    const shiftId = scheduled[0]?.shiftId ?? byDate.get(date)?.[0]?.shiftId;
    const shift = calendar.shiftMap.get(shiftId);
    const off = shiftId === OFF || (String(shift?.holidayRule).toLowerCase() === 'off' && calendar.holidayNames.has(date));
    const interval = off ? undefined : shiftInterval(date, shift);
    if (!off && (scheduled.length || shiftId) && !interval) issues.push('A roster shift is missing or has invalid hours');
    const value = { shift, window: interval ? { start: interval.start * 60, end: interval.end * 60 } : null, off, issues };
    schedules.set(date, value);
    return value;
  }

  const clocked = readPayrollPunches(punches, date => scheduleFor(date).window);
  let workedSeconds = 0, paidSeconds = 0, overtimeSeconds = 0;
  const issues = new Set<string>();
  for (const date of dates) {
    const daySchedule = scheduleFor(date);
    const entries = byDate.get(date) ?? [];
    const attendance = attendanceForDay(entries, clocked.get(date));
    const dayIssues = new Set(daySchedule.issues);
    if (entries.length > 1) dayIssues.add('Duplicate attendance dates');
    if (attendance) {
      workedSeconds += overlap(attendance.worked, -Infinity, Infinity);
      for (const issue of attendance.issues) dayIssues.add(issue);
      if (daySchedule.off) dayIssues.add('Attendance was recorded on a scheduled off day');
      else if (!daySchedule.shift) dayIssues.add('Attendance has no assigned shift');
    }
    const totals = payForDay(daySchedule, attendance, leave.get(date), dayIssues);
    if (dayIssues.size === 0) {
      paidSeconds += totals.paid;
      overtimeSeconds += totals.overtime;
    }
    for (const issue of dayIssues) issues.add(issue);
  }
  const hours = (seconds: number) => Math.round(seconds / 36) / 100;
  return { workedHours: hours(workedSeconds), paidHours: hours(paidSeconds), recordedOt: hours(overtimeSeconds), issues };
}
