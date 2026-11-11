import { useState, type FormEvent } from 'react';
import { CalendarRange, Clock3 } from 'lucide-react';
import { repeatLabels, rosterFailure, rosterPlannerApi, slotCounts, type Repeat, type RosterDetail, type RosterDraft, type RosterOptions } from '../../api/rosterPlannerApi';
import EmployeeSelection from './EmployeeSelection';
import RosterFeedback, { ShiftOptions } from './RosterFeedback';
import { addDays, isRosterDate, shortDate, todayInColombo, weekday } from './rosterDates';

type Template = Record<string, string[]>;
const blank = (repeat: Repeat) => Array<string>(slotCounts[repeat]).fill('OFF');
const repeatHelp: Record<Repeat, string> = {
  none: 'One schedule covering up to seven days from the start date.',
  weekly: 'The seven-day pattern repeats from the start date through the end date.',
  biweekly: 'Week 1 and Week 2 alternate through the end date.',
  monthly: 'Assignments use the day of the month. Days 29–31 are skipped in months where they do not exist.',
};

export default function RosterEditor({ options, existing, onBack, onSaved }: {
  options: RosterOptions; existing?: RosterDetail; onBack: () => void; onSaved: (draft: RosterDraft, saved: { id: string; version: number }) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [start, setStart] = useState(existing?.startDate ?? todayInColombo());
  const [end, setEnd] = useState(existing?.endDate ?? addDays(todayInColombo(), 6));
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? 'none');
  const [selected, setSelected] = useState(existing?.employees.map(member => member.employeeId) ?? []);
  const [templates, setTemplates] = useState<Partial<Record<Repeat, Template>>>(() => existing
    ? { [existing.repeat]: Object.fromEntries(existing.employees.map(member => [member.employeeId, member.shifts])) } : {});
  const [week, setWeek] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const template = templates[repeat] ?? {};
  const offset = repeat === 'biweekly' ? week * 7 : 0;
  const slots = Array.from({ length: repeat === 'monthly' ? 31 : 7 }, (_, index) => offset + index);

  function chooseRepeat(next: Repeat) {
    if (!templates[next] && repeat !== 'monthly' && next !== 'monthly') {
      const copy = Object.fromEntries(Object.entries(template).map(([id, values]) => [id,
        Array.from({ length: slotCounts[next] }, (_, index) => values[index] ?? values[index % 7] ?? 'OFF')]));
      setTemplates(current => ({ ...current, [next]: copy }));
    }
    setRepeat(next);
    setWeek(0);
  }

  function selectShift(id: string, slot: number, value: string) {
    setTemplates(current => {
      const shifts = [...(current[repeat]?.[id] ?? blank(repeat))];
      shifts[slot] = value;
      return { ...current, [repeat]: { ...current[repeat], [id]: shifts } };
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (!name.trim()) return setError('Enter a roster name.');
    if (!isRosterDate(start) || !isRosterDate(end)) return setError('Enter a valid start date and end date.');
    if (end < start) return setError('End date cannot be earlier than start date.');
    if (repeat === 'none' && end > addDays(start, 6)) return setError('Do Not Repeat covers up to seven days. Choose a repeat setting for a longer range.');
    if (!selected.length || selected.length > 35) return setError('Select between 1 and 35 employees.');
    const draft = { name: name.trim(), startDate: start, endDate: end, repeat, employees: selected.map(employeeId => ({
      employeeId, shifts: template[employeeId] ?? blank(repeat),
    })) };
    setSaving(true);
    try { onSaved(draft, (await rosterPlannerApi.save(draft, existing)).data.data); }
    catch (failure) { setError(rosterFailure(failure, 'Could not save the draft.').message); }
    finally { setSaving(false); }
  }

  return <form className="roster-editor" onSubmit={save}>
    <fieldset disabled={saving} className="roster-editor-fields">
      <section className="roster-section" aria-labelledby="roster-details-title">
        <div className="roster-section-heading"><h3 id="roster-details-title">Roster Details</h3></div>
        <div className="roster-fields roster-details-fields">
          <label>Roster Name<input className="input-field" required value={name} maxLength={255} placeholder="e.g. Kitchen team" onChange={event => setName(event.target.value)} /></label>
          <label>Start Date<input className="input-field" type="date" required value={start} onInput={event => setStart(event.currentTarget.value)} /></label>
          <label>End Date<input className="input-field" type="date" required min={start} value={end} onInput={event => setEnd(event.currentTarget.value)} /></label>
        </div>
      </section>
      <EmployeeSelection options={options} selected={selected} onChange={setSelected} />
      <section className="roster-section" aria-labelledby="roster-repeat-title">
        <div className="roster-section-heading"><h3 id="roster-repeat-title">Repeat Settings</h3></div>
        <div className="roster-repeat-options" role="radiogroup" aria-label="Repeat setting">
          {(Object.keys(repeatLabels) as Repeat[]).map(option => <label key={option} className={repeat === option ? 'is-selected' : undefined}>
            <input type="radio" name="roster-repeat" checked={repeat === option} onChange={() => chooseRepeat(option)} />{repeatLabels[option]}
          </label>)}
        </div>
        <p className="roster-hint">{repeatHelp[repeat]}</p>
      </section>
      <section className="roster-section" aria-labelledby="roster-shifts-title">
        <div className="roster-section-heading"><h3 id="roster-shifts-title">Assign Shifts</h3><span><Clock3 size={14} /> Sri Lanka time</span></div>
        {repeat === 'biweekly' && <div className="roster-switch" aria-label="Pattern week">
          {[0, 1].map(index => <button type="button" aria-pressed={week === index} onClick={() => setWeek(index)} key={index}>Week {index + 1}</button>)}
        </div>}
        {selected.length === 0 ? <div className="roster-empty"><CalendarRange size={22} />Select employees to assign shifts.</div> :
          <div className="roster-grid-scroll" role="region" aria-label="Employee shift pattern" tabIndex={0}>
            <table className="roster-grid roster-template-grid">
              <thead><tr><th scope="col">Employee</th>{slots.map(slot => {
                const date = repeat !== 'monthly' && isRosterDate(start) ? addDays(start, slot) : undefined;
                return <th scope="col" key={slot}>{date ? <>{weekday(date)}<small>{shortDate(date)}</small></> : `Day ${slot + 1}`}</th>;
              })}</tr></thead>
              <tbody>{selected.map(id => {
                const employee = options.employees.find(item => item.id === id);
                return <tr key={id}><th scope="row">{employee?.name || 'Unavailable employee'}<small>{employee?.employeeNumber}</small></th>
                  {slots.map(slot => {
                    const value = template[id]?.[slot] ?? 'OFF';
                    return <td key={slot}><select aria-label={`${employee?.name || 'Employee'} day ${slot + 1} shift`} value={value}
                      onChange={event => selectShift(id, slot, event.target.value)} className="roster-shift-select">
                      <ShiftOptions shifts={options.shifts} current={value} />
                    </select></td>;
                  })}
                </tr>;
              })}</tbody>
            </table>
          </div>}
      </section>
    </fieldset>
    <RosterFeedback error={error} employees={options.employees} />
    <div className="roster-form-actions"><button type="button" className="btn-secondary" onClick={onBack} disabled={saving}>Cancel</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Draft & Preview'}</button>
    </div>
  </form>;
}
