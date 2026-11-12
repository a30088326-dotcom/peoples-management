import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChartNoAxesCombined, ClipboardCheck, FileText, Settings2, Users, Wallet, X } from 'lucide-react';
import { payrollApi, payrollMessage, monthLabel, type Action, type Employee, type Line, type Payroll } from '../payrollApi';
import { InputEditor, ProfileEditor, RulesEditor } from '../components/PayrollEditors';
import { Overview, PayrollTable, RunProgress } from '../components/PayrollRun';
import { amount, PayBreakdown, Reports } from '../components/PayrollReports';
import './payroll.css';

const tabs = [
  ['overview', 'Overview', ChartNoAxesCombined], ['run', 'Payroll run', Wallet], ['profiles', 'Salary profiles', Users],
  ['inputs', 'Attendance inputs', CalendarDays], ['payslips', 'Payslips', FileText],
  ['reports', 'Reports & exports', ClipboardCheck], ['rules', 'Payroll rules', Settings2],
] as const;
type Tab = typeof tabs[number][0];
type Editor = { type: 'profile'; employee: Employee } | { type: 'input' | 'details'; row: Line };
const currentMonth = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
const validMonth = (value: string) => /^20\d{2}-(0[1-9]|1[0-2])$/.test(value);

export default function PayrollWorkspace() {
  const [month, setMonth] = useState(currentMonth);
  const [tab, go] = useState<Tab>('overview');
  const [data, setData] = useState<Payroll>();
  const [revision, reload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Editor>();
  const [approval, setApproval] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const refresh = () => reload(value => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    payrollApi.view(month, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result.data.data);
    }).catch(failure => {
      if (!controller.signal.aborted) { setData(undefined); setError(payrollMessage(failure)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, revision]);
  useEffect(() => {
    if ((editor || approval) && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [editor, approval]);
  const closeDialog = () => { setEditor(undefined); setApproval(false); };
  const afterSave = () => { closeDialog(); refresh(); };
  const openDetails = (row: Line) => setEditor({ type: 'details', row });
  async function run(action: Action) {
    if (busy || !data || data.period !== month) return;
    setError(''); setBusy(true);
    try { await payrollApi.run(month, action, data.version); afterSave(); }
    catch (failure) { closeDialog(); setError(payrollMessage(failure)); }
    finally { setBusy(false); }
  }
  const shown = data?.period === month ? data : undefined;
  const approved = shown?.status === 'approved';
  const departments = [...new Set(shown?.employees.map(employee => employee.department).filter(Boolean) ?? [])].sort();
  const matches = (row: { name: string; employeeNumber: string; department: string }) => (!department || row.department === department) &&
    [row.name, row.employeeNumber].some(value => value.toLowerCase().includes(search.trim().toLowerCase()));
  const rows = shown?.rows.filter(matches) ?? [];
  const employees = shown?.employees.filter(matches) ?? [];
  const needsReview = shown?.rows.filter(row => row.issues.length).length ?? 0;
  const editable = Boolean(shown?.access.canEdit) && !approved && !loading && !busy;
  const filter = <div className="payroll-filters">
    <input type="search" className="input-field" aria-label="Find employee" placeholder="Find employee…" value={search} onChange={event => setSearch(event.target.value)} />
    <select className="input-field" aria-label="Department" value={department} onChange={event => setDepartment(event.target.value)}>
      <option value="">All departments</option>{departments.map(item => <option key={item}>{item}</option>)}</select>
  </div>;

  return <main className="payroll-workspace" data-testid="payroll-workspace">
    <header className="payroll-heading">
      <div><span className="payroll-kicker">PAYROLL MANAGEMENT</span><h1>{tab === 'overview' ? 'Payroll overview' : tabs.find(item => item[0] === tab)?.[1]}</h1>
        <p>Monthly payroll · LKR</p></div>
      <label>Payroll period<input aria-label="Payroll period" className="input-field" type="month" value={month}
        onInput={event => { if (validMonth(event.currentTarget.value)) setMonth(event.currentTarget.value); }} disabled={busy} /></label>
    </header>
    <nav className="payroll-tabs" aria-label="Payroll navigation">{tabs.map(([id, label, Icon]) => <button type="button" key={id}
      aria-pressed={tab === id} onClick={() => { go(id); setDepartment(''); setSearch(''); }}>
      <Icon size={16} /> {label}{id === 'inputs' && needsReview > 0 && <span>{needsReview}</span>}</button>)}</nav>
    {error && <div className="payroll-alert" role="alert">{error} {!shown && <button className="btn-secondary" onClick={refresh}>Retry</button>}</div>}
    {loading && <p role="status" className="payroll-notice">Loading payroll…</p>}
    {shown && !loading && <>
      {tab === 'overview' && <Overview data={shown} go={go} open={openDetails} />}
      {tab === 'run' && <>
        <RunProgress data={shown} />
        <section className="payroll-card">
          <header className="payroll-card-heading"><div><h2>Employee calculations</h2><p>{shown.stale ? 'Inputs changed. Recalculate to save a fresh snapshot.' : approved ? 'Approved snapshot is locked.' : 'Review each employee’s earnings and deductions.'}</p></div>
            <div className="payroll-actions">
              {shown.status === 'draft' && shown.access.canCreate && <button className="btn-primary" disabled={busy || !shown.rulesConfigured || !shown.rows.length || !!needsReview}
                onClick={() => void run('calculate')}>{shown.stale ? 'Recalculate payroll' : 'Calculate payroll'}</button>}
              {shown.status === 'calculated' && shown.access.canEdit && <button className="btn-primary" disabled={busy} onClick={() => void run('submit')}>Submit for review</button>}
              {shown.status === 'submitted' && shown.access.canApprove && <><button className="btn-secondary" disabled={busy} onClick={() => void run('return')}>Return for review</button>
                <button className="btn-primary" disabled={busy} onClick={() => setApproval(true)}>Review & approve</button></>}
              {approved && <button className="btn-primary" onClick={() => go('payslips')}>View payslips</button>}
            </div>
          </header>
          {!approved && (!shown.rulesConfigured || !shown.rows.length || needsReview > 0) && <div className="payroll-notice">
            {!shown.rulesConfigured ? 'Save payroll rules first.' : !shown.rows.length ? 'Add a salary profile first.' : `${needsReview} employee inputs need review.`}
            <button className="btn-secondary" onClick={() => go(!shown.rulesConfigured ? 'rules' : !shown.rows.length ? 'profiles' : 'inputs')}>Review setup</button></div>}
          {filter}<PayrollTable rows={rows} open={openDetails} />
        </section>
        <section className="payroll-card"><h2>Activity trail</h2>{shown.audit.length ? <ul className="payroll-history">
          {shown.audit.map((event, i) => <li key={i}><strong>{event.action}</strong><span>{event.at} · Sri Lanka time</span></li>)}
        </ul> : <p>No saved activity for this period.</p>}</section>
      </>}
      {tab === 'profiles' && <section className="payroll-card"><header className="payroll-card-heading"><div><h2>Salary profiles</h2><p>Use HR employee records to set monthly salary, fixed allowance and loan deductions.</p></div></header>
        {filter}<div className="payroll-table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Monthly basic</th><th>Effective month</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{employees.map(employee => <tr key={employee.id}><td><strong>{employee.name}</strong><small>{employee.employeeNumber} · {employee.designation}</small></td>
            <td>{employee.department || '—'}</td><td>{amount(employee.profile?.basic)}</td><td>{employee.profile ? monthLabel(employee.profile.effectiveMonth) : '—'}</td>
            <td>{employee.profile ? employee.profile.enabled ? 'Included' : 'Excluded' : 'Setup needed'}</td><td><button className="btn-secondary" disabled={!editable}
              onClick={() => setEditor({ type: 'profile', employee })}>{employee.profile ? 'Edit profile' : 'Set up profile'}</button></td></tr>)}
            {!employees.length && <tr><td colSpan={6}>No payroll-eligible employees match this view.</td></tr>}</tbody></table></div></section>}
      {tab === 'inputs' && <section className="payroll-card"><header className="payroll-card-heading"><div><h2>Attendance inputs</h2><p>Payable hours reflect shift times, grace periods, breaks and approved paid leave.</p></div><button className="btn-secondary" onClick={refresh}>Refresh HR inputs</button></header>
        {filter}<div className="payroll-table-scroll"><table><thead><tr><th>Employee</th><th>Roster days</th><th>Paid leave</th><th>Unpaid leave</th><th>Worked hours</th><th>Payable hours</th><th>Recorded OT</th><th>Approved OT</th><th>Review status</th><th>Action</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.employeeId}><td><strong>{row.name}</strong><small>{row.employeeNumber}</small></td><td>{row.rosterDays}</td><td>{row.paidDays}</td><td>{row.unpaidDays}</td>
            <td>{row.workedHours}</td><td>{row.paidHours ?? '—'}</td><td>{row.recordedOt}</td><td>{row.input.otHours}</td><td>{row.issues.length ? <ul>{row.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : 'Ready'}</td>
            <td><button className="btn-secondary" disabled={!editable} onClick={() => setEditor({ type: 'input', row })}>Review inputs</button></td></tr>)}
            {!rows.length && <tr><td colSpan={10}>Set up salary profiles to import attendance.</td></tr>}</tbody></table></div></section>}
      {tab === 'rules' && <section className="payroll-card"><h2>Payroll rules</h2><p>Set effective dates and confirm how this workspace treats earnings and unpaid leave.</p>
        <RulesEditor key={`${month}-${revision}`} rules={shown.rules} month={month} locked={!editable} onSaved={refresh} /></section>}
      {tab === 'payslips' && <section className="payroll-card"><h2>Payslips</h2>
        {approved ? <>{filter}<PayrollTable rows={rows} open={openDetails} /></> : <p>Payslips become available after the run is approved.</p>}</section>}
      {tab === 'reports' && <Reports data={shown} />}
    </>}
    {(editor || approval) && shown && <dialog className="payroll-dialog" ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) closeDialog(); }} aria-labelledby="payroll-dialog-title">
      <header className="payroll-card-heading"><h2 id="payroll-dialog-title">{approval ? 'Approve payroll' : editor?.type === 'profile' ? editor.employee.name : editor?.row.name}</h2>
        <button className="app-action app-action-icon payroll-no-print" aria-label="Close dialog" onClick={closeDialog} disabled={busy}><X size={18} /></button></header>
      {approval && <><p>Approve and lock the {monthLabel(month)} snapshot for {shown.rows.length} employees. Payslips and reports will use these amounts.</p>
        <button className="btn-primary" disabled={busy} onClick={() => void run('approve')}>{busy ? 'Approving…' : 'Approve and lock'}</button></>}
      {editor?.type === 'profile' && <ProfileEditor employee={editor.employee} month={month} onSaved={afterSave} locked={!editable} />}
      {editor?.type === 'input' && <InputEditor row={editor.row} month={month} onSaved={afterSave} locked={!editable} manualTax={shown.rules.taxMode === 'verified-input'} />}
      {editor?.type === 'details' && <PayBreakdown row={editor.row} period={month} approved={approved} />}
    </dialog>}
  </main>;
}
