import { z } from 'zod';
import { RosterError, validRosterDate } from '../roster-validation';

export const OFF = 'OFF';
const dayMs = 86_400_000;
const id = z.string().min(1).max(36).regex(/^[\w-]+$/);
const date = z.string().refine(validRosterDate, 'Enter a valid date.');
const shiftId = z.union([z.literal(OFF), id]);
export const repeatSchema = z.enum(['none', 'weekly', 'biweekly', 'monthly']);
export type Repeat = z.infer<typeof repeatSchema>;
export const patternLength: Record<Repeat, number> = { none: 7, weekly: 7, biweekly: 14, monthly: 31 };

export const draftSchema = z.object({
  name: z.string().trim().min(1, 'Enter a roster name.').max(255),
  startDate: date,
  endDate: date,
  repeat: repeatSchema,
  employees: z.array(z.object({ employeeId: id, shifts: z.array(shiftId).min(7).max(31) })).min(1, 'Select at least one employee.').max(35),
}).superRefine((draft, context) => {
  const days = daysBetween(draft.startDate, draft.endDate);
  if (days < 0) context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be earlier than start date.' });
  if (days >= (draft.repeat === 'none' ? 7 : 366)) context.addIssue({ code: 'custom', path: ['endDate'],
    message: draft.repeat === 'none' ? 'A non-repeating roster can cover up to seven days.' : 'A roster can cover up to 366 days.' });
  if (new Set(draft.employees.map(member => member.employeeId)).size !== draft.employees.length) {
    context.addIssue({ code: 'custom', path: ['employees'], message: 'Select each employee only once.' });
  }
  if (draft.employees.some(member => member.shifts.length !== patternLength[draft.repeat])) {
    context.addIssue({ code: 'custom', path: ['employees'], message: 'Assign a shift or OFF to each day in the pattern.' });
  }
});

export const changeSchema = z.object({ employeeId: id, date, shiftId, version: z.number().int().positive(),
  scope: z.enum(['occurrence', 'future', 'pattern']) });
export type Draft = z.infer<typeof draftSchema>;
export type ShiftChange = z.infer<typeof changeSchema>;
type Exception = Omit<ShiftChange, 'version' | 'scope'> & { scope: 'occurrence' | 'future' };
export type Plan = Draft & { version: number; exceptions: Exception[]; publishedAt?: string; publishedBy?: string };
export type RosterRow = { id: string; name: string; code: string; status: string; schedulePlan?: unknown; [key: string]: any };

function dateMillis(value: string) { return Date.parse(`${value}T00:00:00Z`); }
export function daysBetween(from: string, to: string) { return (dateMillis(to) - dateMillis(from)) / dayMs; }
export function addDays(value: string, days: number) { return new Date(dateMillis(value) + days * dayMs).toISOString().slice(0, 10); }
export function datesBetween(from: string, to: string) {
  return Array.from({ length: Math.max(0, daysBetween(from, to) + 1) }, (_, index) => addDays(from, index));
}

export function readPlan(row?: Record<string, unknown>): Plan | undefined {
  if (!row?.schedulePlan) return undefined;
  const value = typeof row.schedulePlan === 'string' ? JSON.parse(row.schedulePlan) : row.schedulePlan;
  if (value && typeof value === 'object' && 'version' in value && 'employees' in value) return value as Plan;
  throw new RosterError(409, 'The saved roster pattern could not be read.');
}

export function slotFor(plan: Draft, date: string): number | undefined {
  if (date < plan.startDate || date > plan.endDate) return undefined;
  if (plan.repeat === 'monthly') return Number(date.slice(8, 10)) - 1;
  return daysBetween(plan.startDate, date) % patternLength[plan.repeat];
}

export function plannedDay(plan: Plan, employeeId: string, date: string) {
  const slot = slotFor(plan, date);
  const employee = plan.employees.find(member => member.employeeId === employeeId);
  if (!employee || slot === undefined) return undefined;
  const exception = plan.exceptions.find(item => item.employeeId === employeeId && item.scope === 'occurrence' && item.date === date);
  if (exception) return { shiftId: exception.shiftId, source: 'occurrence' as const };
  const future = plan.exceptions.reduce<Exception | undefined>((latest, item) => {
    if (item.employeeId !== employeeId || item.scope !== 'future' || item.date > date || slotFor(plan, item.date) !== slot) return latest;
    return !latest || item.date > latest.date ? item : latest;
  }, undefined);
  return { shiftId: future?.shiftId ?? employee.shifts[slot], source: future ? 'future' as const : 'pattern' as const };
}

export function applyChange(plan: Plan, change: ShiftChange): Plan {
  const slot = slotFor(plan, change.date);
  if (slot === undefined || !plan.employees.some(member => member.employeeId === change.employeeId)) {
    throw new RosterError(400, 'Select an employee and date in this roster.');
  }
  if (plan.repeat === 'none' && change.scope !== 'occurrence') throw new RosterError(400, 'This roster does not repeat.');
  // A broader change includes the selected date, even if it already has a one-time override.
  const remaining = plan.exceptions.filter(item => item.employeeId !== change.employeeId ||
    item.scope !== 'occurrence' || item.date !== change.date);
  if (change.scope === 'pattern') {
    return { ...plan, employees: plan.employees.map(member => member.employeeId === change.employeeId
      ? { ...member, shifts: member.shifts.map((shift, index) => index === slot ? change.shiftId : shift) } : member),
    exceptions: remaining.filter(item => item.employeeId !== change.employeeId || item.scope !== 'future' || slotFor(plan, item.date) !== slot) };
  }
  const scope = change.scope;
  const exceptions = remaining.filter(item => item.employeeId !== change.employeeId || item.scope !== 'future' ||
    scope === 'occurrence' || item.date < change.date || slotFor(plan, item.date) !== slot);
  return { ...plan, exceptions: [...exceptions, { scope, employeeId: change.employeeId, date: change.date, shiftId: change.shiftId }] };
}

export function shiftInterval(date: string, shift?: { startTime?: unknown; endTime?: unknown; crossMidnight?: unknown }) {
  const minutes = (value: unknown) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value));
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
  };
  const start = minutes(shift?.startTime);
  const end = minutes(shift?.endTime);
  if (!Number.isFinite(start + end) || start === end) return undefined;
  const overnight = end < start || shift?.crossMidnight === true || Number(shift?.crossMidnight) === 1;
  const endOfShift = end + (overnight ? 1440 : 0);
  if (endOfShift - start > 1440) return undefined;
  const minute = dateMillis(date) / 60000;
  return { start: minute + start, end: minute + endOfShift, overnight };
}

export function memberCalendar(plan: Plan, employeeId: string) {
  return datesBetween(plan.startDate, plan.endDate).flatMap(date => {
    const day = plannedDay(plan, employeeId, date);
    return day ? [{ date, shiftId: day.shiftId === OFF ? null : day.shiftId, isOffDay: day.shiftId === OFF }] : [];
  });
}
