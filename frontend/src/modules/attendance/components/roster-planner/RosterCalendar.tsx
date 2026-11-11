import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { rosterFailure, rosterPlannerApi, type CalendarCell, type RosterCalendarData, type RosterOptions, type Staff } from '../../api/rosterPlannerApi';
import RosterFeedback from './RosterFeedback';
import ShiftExceptionDialog from './ShiftExceptionDialog';
import { calendarRange, isRosterDate, moveCalendar, shortDate, todayInColombo, weekday } from './rosterDates';

function CellContent({ cell }: { cell: CalendarCell }) {
  return <>
    <strong>{cell.shiftId === 'OFF' ? 'OFF' : cell.shift?.name || (cell.rosterId ? 'Shift unavailable' : cell.leave ? 'Leave' : '—')}</strong>
    {cell.shift && <small>{cell.shift.startTime?.slice(0, 5)}–{cell.shift.endTime?.slice(0, 5)}{cell.shift.overnight ? ' (+1d)' : ''}</small>}
    {cell.source === 'occurrence' && <small>One-time change</small>}
    {cell.source === 'future' && <small>Pattern change</small>}
    {cell.leave && cell.rosterId && <small>Approved leave</small>}
    {cell.lock && <small><LockKeyhole size={11} /> {cell.lock}</small>}
    {cell.issues?.map(issue => <small className="roster-cell-issue" key={issue}><AlertTriangle size={11} /> {issue}</small>)}
  </>;
}

export default function RosterCalendar({ options, anchor, setAnchor, rosterId, setRosterId, onPublished, onVersion }: {
  options: RosterOptions; anchor: string; setAnchor: (value: string) => void;
  rosterId: string; setRosterId: (value: string) => void; onPublished: (id: string, version: number) => void; onVersion: (id: string, version: number) => void;
}) {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [department, setDepartment] = useState('');
  const [data, setData] = useState<RosterCalendarData>();
  const [busy, setBusy] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [publishError, setPublishError] = useState<ReturnType<typeof rosterFailure>>();
  const [edit, setEdit] = useState<{ employee: Staff; cell: CalendarCell }>();
  const [notice, setNotice] = useState('');
  const range = calendarRange(anchor, mode);
  const selected = options.rosters.find(roster => roster.id === rosterId);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setLoadError('');
    rosterPlannerApi.calendar({ ...range, departmentId: department || undefined, rosterId: rosterId || undefined }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result.data.data); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(rosterFailure(error, 'Could not load the calendar.').message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [range.from, range.to, rosterId, department, refresh]);

  async function publish() {
    if (!selected || publishing || !window.confirm(`Publish ${selected.name} for ${selected.employeeCount} employee(s)?`)) return;
    setPublishing(true);
    setPublishError(undefined);
    setNotice('');
    try {
      const { data: saved } = (await rosterPlannerApi.publish(selected.id, selected.version)).data;
      onPublished(saved.id, saved.version);
      setNotice('Roster published. The scheduled shifts are now active.');
      setRefresh(value => value + 1);
    } catch (error) { setPublishError(rosterFailure(error, 'Could not publish the roster.')); }
    finally { setPublishing(false); }
  }

  return <section className="roster-calendar" aria-label="Roster calendar">
    <div className="roster-calendar-bar">
      <div className="roster-period">
        <button type="button" className="app-action app-action-icon" aria-label={`Previous ${mode}`} onClick={() => setAnchor(moveCalendar(anchor, mode, -1))}><ChevronLeft size={17} /></button>
        <strong>{shortDate(range.from)} – {shortDate(range.to)} {range.to.slice(0, 4)}</strong>
        <button type="button" className="app-action app-action-icon" aria-label={`Next ${mode}`} onClick={() => setAnchor(moveCalendar(anchor, mode, 1))}><ChevronRight size={17} /></button>
        <button type="button" className="btn-secondary" onClick={() => setAnchor(todayInColombo())}>Today</button>
      </div>
      <div className="roster-switch" aria-label="Calendar view">
        <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Week</button>
        <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button>
      </div>
    </div>
    <div className="roster-fields roster-calendar-filters">
      <label>Department<select className="input-field" value={department} onChange={event => setDepartment(event.target.value)}>
        <option value="">All Departments</option>{options.departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
      </select></label>
      <label>Roster<select className="input-field" value={rosterId} onChange={event => {
        const value = event.target.value;
        setRosterId(value); setPublishError(undefined); setNotice('');
        const roster = options.rosters.find(item => item.id === value);
        if (roster) setAnchor(roster.startDate);
      }}>
        <option value="">All Published Rosters</option>
        {options.rosters.map(roster => <option value={roster.id} key={roster.id}>{roster.name}{roster.status === 'Draft' ? ' (Draft)' : ''}</option>)}
        {options.legacy.map(roster => <option value={roster.id} key={roster.id}>{roster.name} (Existing)</option>)}
      </select></label>
      <label>Go to date<input type="date" className="input-field" defaultValue={anchor} key={anchor} onBlur={event => {
        if (isRosterDate(event.currentTarget.value)) setAnchor(event.currentTarget.value);
        else event.currentTarget.value = anchor;
      }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label>
    </div>
    {selected?.status === 'Draft' && <div className="roster-preview-bar">
      <div><strong>Draft preview · {selected.name}</strong><p>Review the planned shifts and resolve any conflicts before publishing.</p></div>
      <button type="button" className="btn-primary" onClick={() => void publish()} disabled={publishing || busy || !!loadError}>{publishing ? 'Publishing…' : 'Publish Roster'}</button>
    </div>}
    {notice && <p className="roster-notice" role="status">{notice}</p>}
    <RosterFeedback error={publishError?.message || loadError} conflicts={publishError?.conflicts} employees={options.employees} />
    {loadError && <button type="button" className="btn-secondary" onClick={() => setRefresh(value => value + 1)}>Retry</button>}
    {busy ? <p role="status" className="roster-empty">Loading scheduled shifts…</p> : !loadError && data && (
      data.employees.length === 0 ? <p className="roster-empty">No employees are scheduled for this period and filter.</p> :
      <div className="roster-grid-scroll" role="region" aria-label="Employee roster grid" tabIndex={0}>
        <table className={`roster-grid roster-calendar-grid roster-calendar-${mode}`}>
          <thead><tr><th scope="col">Employee</th>{data.days.map(day => <th scope="col" key={day.date} className={day.holidays.length ? 'roster-holiday' : undefined}>
            {weekday(day.date)} {shortDate(day.date)}{day.holidays.map(name => <small key={name}>{name}</small>)}
          </th>)}</tr></thead>
          <tbody>{data.employees.map(employee => <tr key={employee.id}>
            <th scope="row">{employee.name}<small>{employee.employeeNumber} · {employee.department || 'No department'}</small></th>
            {employee.cells.map(cell => <td key={cell.date}>
              {cell.editable ? <button className={`roster-cell ${cell.shiftId === 'OFF' ? 'roster-cell-off' : 'roster-cell-working'}`}
                type="button" aria-label={`Edit ${employee.name} on ${cell.date}`} onClick={() => setEdit({ employee, cell })}>
                <CellContent cell={cell} />
              </button> : <div className={`roster-cell ${cell.shiftId === 'OFF' ? 'roster-cell-off' : cell.rosterId ? 'roster-cell-working' : ''}`}><CellContent cell={cell} /></div>}
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    )}
    <p className="roster-hint">OFF = nonworking day. (+1d) = shift ends the next day. Select a published shift to change its schedule.</p>
    {edit && <ShiftExceptionDialog {...edit} options={options} onClose={() => setEdit(undefined)} onSaved={(id, version) => {
      setEdit(undefined); onVersion(id, version); setRefresh(value => value + 1); setNotice('Scheduled shift updated.');
    }} />}
  </section>;
}
