import {
  attendancePunchType, dateAt, daySeconds, sessionCanContinue, timestamp, workDateForTimestamp, type Interval,
} from './payroll-time';

export type PayrollPunch = { id: string; timestamp: string | null; logType: string | null };

export interface PunchDay {
  first: number | null;
  last: number | null;
  worked: Interval[];
  breaks: Interval[];
  issues: string[];
}

interface OpenSession {
  date: string;
  start: number;
  segmentStart: number;
  onBreak: boolean;
}

export function readPayrollPunches(punches: PayrollPunch[], windowFor: (date: string) => Interval | null): Map<string, PunchDay> {
  const days = new Map<string, PunchDay>();
  const events = punches.flatMap(punch => {
    const time = timestamp(punch.timestamp);
    return time == null ? [] : [{ id: punch.id, time, kind: attendancePunchType(punch.logType) }];
  }).sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));

  function punchesFor(date: string) {
    const existing = days.get(date);
    if (existing) return existing;
    const created: PunchDay = { first: null, last: null, worked: [], breaks: [], issues: [] };
    days.set(date, created);
    return created;
  }

  const workDate = (time: number) => workDateForTimestamp(time, windowFor);

  function closeSegment(session: OpenSession, time: number, day: PunchDay) {
    if (time <= session.segmentStart) {
      day.issues.push('Multiple attendance punches have the same time.');
      return;
    }
    (session.onBreak ? day.breaks : day.worked).push({ start: session.segmentStart, end: time });
  }

  let open: OpenSession | null = null;
  for (const event of events) {
    if (open && !sessionCanContinue(open.start, event.time, windowFor(open.date))) {
      punchesFor(open.date).issues.push('Clock-in has no matching clock-out.');
      open = null;
    }
    if (event.kind === 'In') {
      const date = workDate(event.time);
      if (open) {
        punchesFor(open.date).issues.push('Clock-in has no matching clock-out.');
        if (open.date === date) continue;
      }
      const day = punchesFor(date);
      const today = windowFor(dateAt(event.time));
      const previous = windowFor(dateAt(event.time - daySeconds));
      if (today && previous && event.time >= today.start && event.time < today.end && event.time < previous.end) {
        day.issues.push('Clock-in fits overlapping shifts on consecutive roster dates.');
      }
      if (day.last === event.time) day.issues.push('Multiple attendance punches have the same time.');
      day.first ??= event.time;
      open = { date, start: event.time, segmentStart: event.time, onBreak: false };
      continue;
    }

    const day = punchesFor(open?.date ?? workDate(event.time));
    if (!event.kind) {
      day.issues.push('Unrecognized attendance punch type.');
    } else if (!open) {
      day.issues.push('Attendance punch has no matching clock-in.');
      if (event.kind === 'Out') day.last = event.time;
    } else if (event.kind === 'Out') {
      const punchDate = dateAt(event.time);
      const nextWindow = punchDate !== open.date ? windowFor(punchDate) : null;
      if (nextWindow && event.time >= nextWindow.start) {
        day.issues.push('The overnight clock-out overlaps the next scheduled shift.');
      }
      closeSegment(open, event.time, day);
      day.last = event.time;
      open = null;
    } else if ((event.kind === 'BreakIn') === open.onBreak) {
      day.issues.push('Break punches are incomplete or out of sequence.');
    } else {
      closeSegment(open, event.time, day);
      open.segmentStart = event.time;
      open.onBreak = !open.onBreak;
    }
  }
  if (open) punchesFor(open.date).issues.push('Clock-in has no matching clock-out.');
  return days;
}
