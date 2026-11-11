import type { Conflict, ShiftOption, Staff } from '../../api/rosterPlannerApi';

export const shiftLabel = (shift: ShiftOption) => `${shift.name} · ${shift.startTime?.slice(0, 5) || '—'}–${shift.endTime?.slice(0, 5) || '—'}${shift.overnight ? ' (+1 day)' : ''}`;

export function ShiftOptions({ shifts, current }: { shifts: ShiftOption[]; current?: string }) {
  return <><option value="OFF">OFF</option>{current && current !== 'OFF' && !shifts.some(shift => shift.id === current) && <option value={current} disabled>Unavailable shift</option>}
    {shifts.map(shift => <option key={shift.id} value={shift.id}>{shiftLabel(shift)}</option>)}</>;
}

export default function RosterFeedback({ error, conflicts = [], employees }: { error: string; conflicts?: Conflict[]; employees: Staff[] }) {
  if (!error) return null;
  return <div role="alert" className="roster-error"><strong>{error}</strong>
    {conflicts.length > 0 && <ul>{conflicts.map((conflict, index) => <li key={`${conflict.employeeId}-${conflict.date}-${index}`}>
      {employees.find(employee => employee.id === conflict.employeeId)?.name || 'Employee'} · {conflict.date} · {conflict.message}
    </li>)}</ul>}
  </div>;
}
