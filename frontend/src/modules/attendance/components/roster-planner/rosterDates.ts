const dayMs = 86_400_000;
export const todayInColombo = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
export const dayDate = (value: string) => new Date(`${value}T00:00:00Z`);
export const dateKey = (value: Date) => value.toISOString().slice(0, 10);
export const isRosterDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(dayDate(value).getTime()) && dateKey(dayDate(value)) === value;
export const addDays = (value: string, days: number) => dateKey(new Date(dayDate(value).getTime() + days * dayMs));
export const shortDate = (value: string) => dayDate(value).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
export const weekday = (value: string) => dayDate(value).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short' });

export function calendarRange(anchor: string, mode: 'week' | 'month') {
  const day = dayDate(anchor);
  if (mode === 'week') {
    const from = addDays(anchor, -((day.getUTCDay() + 6) % 7));
    return { from, to: addDays(from, 6) };
  }
  return { from: `${anchor.slice(0, 7)}-01`, to: dateKey(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0))) };
}

export function moveCalendar(anchor: string, mode: 'week' | 'month', direction: number) {
  if (mode === 'week') return addDays(anchor, 7 * direction);
  const day = dayDate(anchor);
  return dateKey(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + direction, 1)));
}
