import { useEffect, useRef, useState, type FormEvent } from 'react';
import { rosterFailure, rosterPlannerApi, type CalendarCell, type RosterOptions, type ShiftScope, type Staff } from '../../api/rosterPlannerApi';
import RosterFeedback, { ShiftOptions } from './RosterFeedback';
import { shortDate } from './rosterDates';

const scopes: { id: ShiftScope; name: string }[] = [
  { id: 'occurrence', name: 'Change this occurrence only' },
  { id: 'future', name: 'Change this and future occurrences' },
  { id: 'pattern', name: 'Update the entire recurring pattern' },
];

export default function ShiftExceptionDialog({ employee, cell, options, onClose, onSaved }: {
  employee: Staff; cell: CalendarCell; options: RosterOptions; onClose: () => void; onSaved: (id: string, version: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shift, setShift] = useState(cell.shiftId || 'OFF');
  const [scope, setScope] = useState<ShiftScope>('occurrence');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ReturnType<typeof rosterFailure>>();
  const repeating = options.rosters.find(roster => roster.id === cell.rosterId)?.repeat !== 'none';
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!cell.rosterId || !cell.version || saving) return;
    setError(undefined);
    setSaving(true);
    try {
      const { data } = (await rosterPlannerApi.change(cell.rosterId, {
        employeeId: employee.id, date: cell.date, shiftId: shift, scope, version: cell.version,
      })).data;
      onSaved(data.id, data.version);
    } catch (failure) { setError(rosterFailure(failure, 'Could not save this shift.')); }
    finally { setSaving(false); }
  }

  return <dialog ref={dialog} className="roster-dialog" aria-labelledby="roster-shift-edit-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={save}>
      <h3 id="roster-shift-edit-title">Edit Scheduled Shift</h3>
      <p className="roster-hint">{employee.name} · {shortDate(cell.date)} · {cell.rosterName}</p>
      <fieldset className="roster-dialog-fields" disabled={saving}>
        <label>Shift<select className="input-field" value={shift} onChange={event => setShift(event.target.value)}>
          <ShiftOptions shifts={options.shifts} current={shift} />
        </select></label>
        <fieldset className="roster-scope-picker"><legend>Apply change to</legend>
          {scopes.filter(option => repeating || option.id === 'occurrence').map(option => <label key={option.id}>
            <input type="radio" name="shift-scope" checked={scope === option.id} onChange={() => setScope(option.id)} /> {option.name}
          </label>)}
        </fieldset>
        {scope !== 'occurrence' && <p className="roster-hint">This changes the same pattern day. Other single-date exceptions stay in place.</p>}
      </fieldset>
      <RosterFeedback error={error?.message || ''} conflicts={error?.conflicts} employees={options.employees} />
      <div className="roster-form-actions"><button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Shift'}</button></div>
    </form>
  </dialog>;
}
