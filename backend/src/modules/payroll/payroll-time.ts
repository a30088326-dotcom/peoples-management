export interface Interval {
  start: number;
  end: number;
}

export const daySeconds = 86_400;

// MySQL DATETIME values are local wall times. UTC arithmetic keeps the payroll
// date and shift times consistent across servers in different time zones.
export function timestamp(value: string | null | undefined): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})[ T]((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d))?$/.exec(value ?? '');
  if (!match) return null;
  const wallTime = `${match[1]}T${match[2]}:${match[3] ?? '00'}`;
  const date = new Date(`${wallTime}Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(wallTime) ? date.valueOf() / 1000 : null;
}

export function dateAt(seconds: number) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export function workDateForTimestamp(time: number, schedule: (date: string) => Interval | null): string {
  const date = dateAt(time);
  const previousDate = dateAt(time - daySeconds);
  const previous = schedule(previousDate);
  const today = schedule(date);
  return previous && time < previous.end && (!today || time < today.start) ? previousDate : date;
}

export function sessionCanContinue(start: number, time: number, window: Interval | null) {
  return time >= start && time - start <= daySeconds &&
    (dateAt(time) === dateAt(start) || (!!window && dateAt(window.end) === dateAt(time)));
}

export function attendancePunchType(value: string | null) {
  const kind = value?.toLowerCase().replace(/[\s_-]/g, '');
  if (kind === 'in' || kind === 'checkin' || kind === 'clockin') return 'In';
  if (kind === 'out' || kind === 'checkout' || kind === 'clockout') return 'Out';
  if (kind === 'breakin' || kind === 'breakstart') return 'BreakIn';
  if (kind === 'breakout' || kind === 'breakend') return 'BreakOut';
  return null;
}
