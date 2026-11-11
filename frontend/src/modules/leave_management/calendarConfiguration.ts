export const calendarDate = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00');
type DayType = { id: string; type: string };
export function weekendSettings(value: unknown): Record<string, string | boolean> {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (Array.isArray(parsed)) return Object.fromEntries(parsed.map(day => [String(day).toUpperCase(), true]));
  if (!parsed || typeof parsed !== 'object') return {};
  return Object.fromEntries(Object.entries(parsed).map(([day, rule]) => [day.toUpperCase(), rule])) as Record<string, string | boolean>;
}
const weekday = (date: Date) => ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][date.getDay()];
export function isWeekend(date: Date, settings: Record<string, string | boolean>, types: DayType[]): boolean {
  const rule = settings[weekday(date)];
  return rule === true || typeof rule === 'string' && types.some(type => type.id === rule && type.type !== 'WORKING_DAY');
}
export function calendarDefaults(year: number, settings: Record<string, string | boolean>, types: DayType[], workingId: string) {
  const result: Record<string, string> = {};
  for (let date = new Date(year, 0, 1); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
    const configured = settings[weekday(date)];
    const id = typeof configured === 'string' && types.some(type => type.id === configured)
      ? configured : !isWeekend(date, settings, types) ? workingId : '';
    if (id) result[`${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`] = id;
  }
  return result;
}
export function workingDayCount(year: number, days: Record<string, string>, settings: Record<string, string | boolean>, types: DayType[]) {
  let count = 0;
  for (let date = new Date(year, 0, 1); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
    const key = `${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const configured = days[key] || settings[weekday(date)];
    const type = types.find(type => type.id === configured);
    count += type ? type.type === 'WORKING_DAY' ? 1 : type.type === 'HALF_DAY_HOLIDAY' ? 0.5 : 0
      : !isWeekend(date, settings, types) ? 1 : 0;
  }
  return count;
}
