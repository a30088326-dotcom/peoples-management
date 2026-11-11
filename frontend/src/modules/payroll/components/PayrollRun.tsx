import { ArrowRight, CircleAlert, CircleCheck, Coins, Landmark, Users, Wallet } from 'lucide-react';
import { amount, totals } from './PayrollReports';
import { money, monthLabel, statusLabel, type Line, type Payroll } from '../payrollApi';

export function RunProgress({ data }: { data: Payroll }) {
  const stages = ['Prepare inputs', 'Calculate', 'Review', 'Approve'];
  const current = ['draft', 'calculated', 'submitted', 'approved'].indexOf(data.status);
  return <section className="payroll-card">
    <header className="payroll-card-heading"><div><h2>Current payroll run</h2><p>{monthLabel(data.period)} · Monthly · LKR</p></div>
      <span className={`payroll-badge ${data.status === 'approved' ? 'green' : ''}`}>{statusLabel[data.status]}</span></header>
    <ol className="payroll-progress" aria-label="Payroll stages">{stages.map((stage, index) => <li key={stage} className={index <= current ? 'current' : ''} aria-current={index === current ? 'step' : undefined}>
      <span>{index < current || data.status === 'approved' ? <CircleCheck size={16} /> : index + 1}</span>{stage}
    </li>)}</ol>
  </section>;
}
export function PayrollTable({ rows, open, status = false }: { rows: Line[]; open: (row: Line) => void; status?: boolean }) {
  return <div className="payroll-table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Gross earnings</th><th>Deductions</th><th>Net payable</th><th>{status ? 'Status' : 'Breakdown'}</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.employeeId}><td><strong>{row.name}</strong><small>{row.employeeNumber} · {row.designation}</small></td>
      <td>{row.department || '—'}</td><td>{amount(row.amounts?.gross)}</td><td>{amount(row.amounts?.deductions)}</td><td><strong>{amount(row.amounts?.net)}</strong></td>
      <td>{status ? <span className={`payroll-badge ${row.issues.length ? 'amber' : 'green'}`}>{row.issues.length ? 'Needs review' : 'Ready'}</span>
        : <button className="btn-secondary" onClick={() => open(row)}>View details</button>}</td></tr>)}
      {!rows.length && <tr><td colSpan={6}>No payroll rows match this view.</td></tr>}</tbody></table></div>;
}
export function Overview({ data, go, open }: { data: Payroll; go: (tab: 'run' | 'inputs' | 'profiles' | 'rules') => void; open: (row: Line) => void }) {
  const metrics = [
    ['Employees in payroll', String(data.rows.length), Users],
    ['Gross earnings', money(totals(data.rows, 'gross')), Coins],
    ['Net payable', money(totals(data.rows, 'net')), Wallet],
    ['Total employer cost', money(totals(data.rows, 'employerCost')), Landmark],
  ] as const;
  const attention = data.rows.filter(row => row.issues.length).length;
  const earnings = [['Earned basic', 'earnedBasic', '#8a74de'], ['Fixed allowances', 'allowance', '#bbaae9'],
    ['Service charge', 'service', '#56a9a6'], ['Approved overtime', 'overtime', '#d5ae58']] as const;
  const gross = totals(data.rows, 'gross');
  return <>
    <div className="payroll-stats">{metrics.map(([label, value, Icon]) => <section className="payroll-card payroll-stat" key={label}>
      <span className="payroll-symbol"><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong></div>
    </section>)}</div>
    <div className="payroll-overview-grid"><RunProgress data={data} /><section className="payroll-card">
      <h2>Needs attention</h2>
      {!data.rows.length && <p><CircleAlert size={16} /> Add salary profiles to prepare a run.</p>}
      {!data.rulesConfigured && <p><CircleAlert size={16} /> Set payroll rules for this month.</p>}
      {attention > 0 && <p><CircleAlert size={16} /> {attention} employee inputs need review.</p>}
      {!attention && data.rows.length > 0 && data.rulesConfigured && <p><CircleCheck size={16} /> Payroll inputs are ready.</p>}
      <button className="btn-secondary" onClick={() => go(!data.rows.length ? 'profiles' : !data.rulesConfigured ? 'rules' : attention ? 'inputs' : 'run')}>Continue payroll <ArrowRight size={15} /></button>
    </section></div>
    <section className="payroll-card"><header className="payroll-card-heading"><h2>Earnings composition</h2><strong>LKR {money(gross)}</strong></header>
      <div className="payroll-bar">{earnings.map(([label, key, color]) => <span key={label} style={{ background: color, width: `${gross ? 100 * totals(data.rows, key) / gross : 0}%` }} />)}</div>
      <div className="payroll-legend">{earnings.map(([label, key, color]) => <span key={label}><i style={{ background: color }} />{label} <strong>{money(totals(data.rows, key))}</strong></span>)}</div>
    </section>
    <section className="payroll-card"><header className="payroll-card-heading"><h2>Employee payroll preview</h2><button className="btn-secondary" onClick={() => go('run')}>Open payroll run</button></header>
      <PayrollTable rows={data.rows.slice(0, 4)} open={open} status /></section>
  </>;
}
