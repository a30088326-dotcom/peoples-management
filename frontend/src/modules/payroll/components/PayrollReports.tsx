import { Download, FileText, LockKeyhole, Printer } from 'lucide-react';
import { money, monthLabel, type Amounts, type Line, type Payroll } from '../payrollApi';

export const totals = (rows: Line[], key: keyof Amounts) => rows.reduce((sum, row) => sum + (row.amounts?.[key] ?? 0), 0);
export const amount = (value: number | undefined) => value === undefined ? '—' : money(value);
export function PayBreakdown({ row, period, approved }: { row: Line; period: string; approved: boolean }) {
  const values = row.amounts;
  if (!values) return <p>Save the payroll rules to calculate these amounts.</p>;
  const pairs: [string, number][] = [
    ['Monthly basic salary', row.profile.basic], ['Unpaid leave adjustment', -values.noPay], ['Earned basic', values.earnedBasic],
    ['Fixed allowance', values.allowance], ['Service charge', values.service], ['Approved overtime', values.overtime],
    ['Gross earnings', values.gross], ['Employee EPF', -values.employeeEpf], ['APIT', -values.apit], ['Loan instalment', -values.loan],
    ['Employer EPF', values.employerEpf], ['Employer ETF', values.etf], ['Employer cost', values.employerCost],
  ];
  return <article className="payroll-print">
    <header><h3>{approved ? 'Payslip' : 'Employee calculation'} · {monthLabel(period)}</h3>
      <p>{row.name} · {row.employeeNumber} · {row.department || '—'} · LKR</p></header>
    <dl>{pairs.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{money(value)}</dd></div>)}</dl>
    <div className="payroll-net"><span>Net payable</span><strong>{money(values.net)}</strong></div>
    {approved && <button className="btn-primary payroll-no-print" type="button" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>}
  </article>;
}
function csvValue(value: string | number) {
  const text = typeof value === 'number' ? value.toFixed(2) : /^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + text.replace(/"/g, '""') + '"';
}
const exports = [
  { title: 'Payroll register', file: 'payroll-register', columns: [['earnedBasic', 'Earned basic'], ['allowance', 'Allowance'], ['service', 'Service charge'], ['overtime', 'Overtime'], ['gross', 'Gross'], ['deductions', 'Deductions'], ['net', 'Net payable']] },
  { title: 'EPF & ETF summary', file: 'epf-etf', columns: [['base', 'Contribution base'], ['employeeEpf', 'Employee EPF'], ['employerEpf', 'Employer EPF'], ['etf', 'Employer ETF']] },
  { title: 'APIT summary', file: 'apit-summary', columns: [['gross', 'Gross earnings'], ['apit', 'APIT']] },
] as const;
function download(payroll: Payroll, report: typeof exports[number]) {
  if (payroll.status !== 'approved' || !payroll.access.canExport) return;
  const columns = ['Employee number', 'Employee', 'Department', 'Period', ...report.columns.map(([, name]) => name)];
  const values = payroll.rows.flatMap(row => row.amounts ? [[row.employeeNumber, row.name, row.department, payroll.period,
    ...report.columns.map(([key]) => row.amounts![key])]] : []);
  const csv = [columns, ...values].map(line => line.map(csvValue).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${report.file}-${payroll.period}.csv`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Reports({ data }: { data: Payroll }) {
  const departments = [...new Set(data.rows.map(row => row.department))].sort();
  const approved = data.status === 'approved';
  return <>
    {!approved && <p className="payroll-notice"><LockKeyhole size={16} /> CSV exports unlock after approval.</p>}
    <div className="payroll-reports">{exports.map(report => <section className="payroll-card" key={report.file}>
      <span className="payroll-symbol"><FileText size={18} /></span><h3>{report.title}</h3>
      <button className="btn-primary" type="button" disabled={!approved || !data.access.canExport} onClick={() => download(data, report)}><Download size={16} /> Download CSV</button>
    </section>)}</div>
    <section className="payroll-card"><h2>Department costs</h2><div className="payroll-table-scroll"><table><thead><tr><th>Department</th><th>Employees</th><th>Gross earnings</th><th>Net payable</th><th>Employer cost</th></tr></thead>
      <tbody>{departments.map(department => {
        const rows = data.rows.filter(row => row.department === department);
        return <tr key={department}><td>{department || 'No department'}</td><td>{rows.length}</td><td>{money(totals(rows, 'gross'))}</td>
          <td>{money(totals(rows, 'net'))}</td><td>{money(totals(rows, 'employerCost'))}</td></tr>;
      })}{!departments.length && <tr><td colSpan={5}>No payroll rows for this month.</td></tr>}</tbody>
    </table></div></section>
  </>;
}
