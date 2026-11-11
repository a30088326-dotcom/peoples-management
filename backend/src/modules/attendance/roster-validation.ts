export class RosterError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

export function validRosterDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function overlapsAssignment(row: Record<string, unknown>, start: string, end?: string | null) {
  const first = String(row.effectiveStartDate || row.effectiveFrom || '').slice(0, 10);
  const last = String(row.effectiveEndDate || row.effectiveTo || '').slice(0, 10);
  return (!end || first <= end) && (!last || last >= start);
}
