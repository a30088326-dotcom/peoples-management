import { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange, Plus } from 'lucide-react';
import { repeatLabels, rosterFailure, rosterPlannerApi, type RosterDetail, type RosterOptions, type RosterSummary } from '../../api/rosterPlannerApi';
import RosterGroups from '../RosterGroups';
import RosterCalendar from './RosterCalendar';
import RosterEditor from './RosterEditor';
import RosterFeedback from './RosterFeedback';
import { shortDate, todayInColombo } from './rosterDates';
import './roster-workspace.css';

type View = 'manage' | 'calendar' | 'existing' | 'editor';
const views = [{ id: 'manage', label: 'Rosters' }, { id: 'calendar', label: 'Calendar' }, { id: 'existing', label: 'Existing Rosters' }] as const;

export default function RosterWorkspace() {
  const [view, setView] = useState<View>('manage');
  const [options, setOptions] = useState<RosterOptions>();
  const [editor, setEditor] = useState<RosterDetail>();
  const [anchor, setAnchor] = useState(todayInColombo);
  const [rosterId, setRosterId] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [opening, setOpening] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<RosterSummary>();
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    rosterPlannerApi.options(controller.signal).then(result => { if (!controller.signal.aborted) setOptions(result.data.data); })
      .catch(failure => { if (!controller.signal.aborted) setError(rosterFailure(failure, 'Could not load the roster planner.').message); });
    return () => controller.abort();
  }, [retry]);

  function openCalendar(roster?: Pick<RosterSummary, 'id' | 'startDate'>) {
    setRosterId(roster?.id || '');
    if (roster) setAnchor(roster.startDate);
    setView('calendar');
  }

  async function openDraft(id: string) {
    setOpening(id);
    setError('');
    try { setEditor((await rosterPlannerApi.detail(id)).data.data); setView('editor'); }
    catch (failure) { setError(rosterFailure(failure, 'Could not open this draft.').message); }
    finally { setOpening(undefined); }
  }

  async function deleteDraft() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await rosterPlannerApi.deleteDraft(deleteTarget.id, deleteTarget.version);
      setOptions(current => current && { ...current, rosters: current.rosters.filter(roster => roster.id !== deleteTarget.id) });
      setNotice(`“${deleteTarget.name}” deleted.`);
      setDeleteTarget(undefined);
    } catch (failure) {
      setError(rosterFailure(failure, 'Could not delete this draft.').message);
    } finally {
      setDeleting(false);
    }
  }

  function updateRoster(id: string, version: number, status?: RosterSummary['status']) {
    setOptions(current => current && { ...current, rosters: current.rosters.map(roster => roster.id === id
      ? { ...roster, version, status: status ?? roster.status } : roster) });
  }

  return <div className="roster-workspace">
    <header className="roster-workspace-heading">
      <div><h2><CalendarRange size={22} /> {view === 'editor' ? editor ? 'Edit Roster' : 'Create Roster' : 'Roster Planner'}</h2>
        <p>Schedule employees using your existing shifts.</p></div>
      {view === 'manage' && <button type="button" className="btn-primary" disabled={!options || !!opening} onClick={() => { setEditor(undefined); setError(''); setView('editor'); }}>
        <Plus size={16} /> Create Roster
      </button>}
    </header>
    {import.meta.env.VITE_ROSTER_PREVIEW === 'true' && <p className="roster-preview-banner">Local roster preview · Sample restaurant data</p>}
    {view !== 'editor' && <nav className="roster-switch" aria-label="Roster views">
      {views.map(item => <button type="button" key={item.id} aria-pressed={view === item.id} disabled={deleting} onClick={() => {
        setDeleteTarget(undefined);
        if (item.id === 'calendar') openCalendar(); else setView(item.id);
      }}>{item.label}</button>)}
    </nav>}
    {view === 'existing' ? <div className="roster-existing"><RosterGroups /></div> : <>
      <RosterFeedback error={error} employees={options?.employees || []} />
      {notice && view === 'manage' && <p role="status" className="roster-hint">{notice}</p>}
      {!options && (error ? <button type="button" className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry</button> : <p role="status" className="roster-empty">Loading employees, shifts and rosters…</p>)}
      {options && view === 'manage' && <div className="roster-list">
        {options.rosters.length === 0 && <div className="roster-empty"><CalendarDays size={24} />No planned rosters yet.</div>}
        {options.rosters.map(roster => <article key={roster.id} className="roster-list-item">
          <div><div className="roster-list-title"><h3>{roster.name}</h3><span className={roster.status === 'Published' ? 'roster-published' : 'roster-draft'}>{roster.status}</span></div>
            <p>{shortDate(roster.startDate)} – {shortDate(roster.endDate)} {roster.endDate.slice(0, 4)} · {repeatLabels[roster.repeat]} · {roster.employeeCount} employees</p></div>
          <div className="roster-list-actions">
            {deleteTarget?.id === roster.id ? <>
              <span>Delete this draft?</span>
              <button type="button" className="btn-secondary" disabled={deleting} onClick={() => setDeleteTarget(undefined)}>Cancel</button>
              <button type="button" className="btn-secondary" disabled={deleting} onClick={() => void deleteDraft()}>{deleting ? 'Deleting…' : 'Confirm delete'}</button>
            </> : <>
              {roster.status === 'Draft' && <>
                <button type="button" className="btn-secondary" disabled={!!opening || !!deleteTarget} onClick={() => void openDraft(roster.id)}>{opening === roster.id ? 'Opening…' : 'Edit Draft'}</button>
                <button type="button" className="btn-secondary" disabled={!!opening || !!deleteTarget} onClick={() => { setError(''); setDeleteTarget(roster); }}>Delete Draft</button>
              </>}
              <button type="button" className="btn-primary" disabled={!!opening || !!deleteTarget} onClick={() => openCalendar(roster)}>{roster.status === 'Draft' ? 'Preview' : 'View Calendar'}</button>
            </>}
          </div>
        </article>)}
      </div>}
      {options && view === 'editor' && <RosterEditor key={editor?.id ?? 'new'} options={options} existing={editor} onBack={() => setView('manage')}
        onSaved={(draft, saved) => {
          const summary: RosterSummary = { id: saved.id, version: saved.version, name: draft.name, startDate: draft.startDate,
            endDate: draft.endDate, repeat: draft.repeat, employeeCount: draft.employees.length, status: 'Draft' };
          setOptions(current => current && { ...current, rosters: [summary, ...current.rosters.filter(roster => roster.id !== saved.id)] });
          openCalendar(summary);
        }} />}
      {options && view === 'calendar' && <RosterCalendar options={options} anchor={anchor} setAnchor={setAnchor} rosterId={rosterId} setRosterId={setRosterId}
        onPublished={(id, version) => updateRoster(id, version, 'Published')} onVersion={updateRoster} />}
    </>}
  </div>;
}
