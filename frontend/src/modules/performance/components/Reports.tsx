import { useState } from 'react';
import { Download } from 'lucide-react';
import type { ReviewSummary } from '../types';
import { downloadCsv, stage } from '../utils/format';
import { Button, Card, Empty, Heading, inputClass } from './UI';

export default function Reports({ reviews }: { reviews: ReviewSummary[] }) {
  const [department, setDepartment] = useState('');
  const [manager, setManager] = useState('');
  const visible = reviews.filter(r => (!department || r.employee?.department === department) && (!manager || r.employee?.managerId === manager));
  const scored = visible.filter(r => r.score !== null);
  const percent = (n: number, total = visible.length) => total ? Math.round(n / total * 100) : 0;
  const departments = [...new Set(visible.map(r => r.employee?.department || 'Unassigned'))].map(name => {
    const rows = visible.filter(r => (r.employee?.department || 'Unassigned') === name);
    const scores = rows.filter(r => r.score !== null);
    return { name, count: rows.length, self: percent(rows.filter(r => r.selfSharedAt).length, rows.length), manager: percent(rows.filter(r => r.managerSharedAt).length, rows.length), closed: percent(rows.filter(r => r.closedAt).length, rows.length), score: scores.length ? (scores.reduce((s, r) => s + r.score!, 0) / scores.length).toFixed(1) : '—' };
  });
  const funnel = [
    ['Eligible', visible.length],
    ['Self-assessment shared', visible.filter(r => r.selfSharedAt).length],
    ['Manager assessment shared', visible.filter(r => r.managerSharedAt).length],
    ['360° complete', visible.filter(r => r.receivedFeedback > 0 && r.pendingFeedback === 0).length],
    ['Closed', visible.filter(r => r.closedAt).length],
  ] as const;
  const ratings = [
    ['5 · Exceptional', 80, 100], ['4 · Exceeds', 60, 80], ['3 · Meets', 40, 60],
    ['2 · Developing', 20, 40], ['1 · Needs improvement', 0, 20],
  ] as const;
  const exportReport = () => downloadCsv('performance-report.csv', [['Employee', 'Employee number', 'Department', 'Manager', 'Cycle', 'Stage', 'Goal progress %', 'Final/shared score / 100', 'Self shared', 'Manager shared', '360 received', '360 pending', 'Development actions', 'Completed actions', 'Closed', 'Acknowledged'], ...visible.map(r => [r.employee?.name || '', r.employee?.employeeNumber || '', r.employee?.department || '', r.employee?.managerName || '', r.cycleName, stage(r), r.progress, r.score, r.selfSharedAt, r.managerSharedAt, r.receivedFeedback, r.pendingFeedback, r.developmentActions, r.completedActions, r.closedAt, r.acknowledgedAt])]);

  return <>
    <p className="mb-2 text-xs font-black uppercase tracking-[.15em] text-blue-600">People analytics</p>
    <Heading title="Performance reports" description="Monitor process completion and spot rating patterns before closing a cycle."><Button secondary onClick={exportReport}><Download size={16}/>Export report</Button></Heading>
    <Card className="mb-5 grid gap-3 sm:grid-cols-2"><select aria-label="Report department" className={inputClass} value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{[...new Set(reviews.map(r => r.employee?.department || ''))].filter(Boolean).map(d => <option key={d}>{d}</option>)}</select><select aria-label="Report manager" className={inputClass} value={manager} onChange={e => setManager(e.target.value)}><option value="">All managers</option>{[...new Map(reviews.filter(r => r.employee?.managerId).map(r => [r.employee!.managerId!, r.employee!.managerName])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Card>
    {!visible.length ? <Empty title="No review data for these filters">Reports use launched reviews in your permitted employee scope.</Empty> : <>
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Process</p><h3 className="mt-2 text-lg font-bold">Completion funnel</h3></div><span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">{visible.length} employees</span></div><div className="space-y-3">{funnel.map(([label,count],i) => <div key={label} className="flex items-center gap-4"><div className="h-11 min-w-16 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ width: `${Math.max(18, percent(count))}%`, background: ['#2b63e5','#4182e2','#619cda','#50aaca','#25ab91'][i] }}>{label}<span className="float-right pl-2 font-bold">{count}</span></div></div>)}</div></Card>
        <Card><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Ratings</p><h3 className="mt-2 text-lg font-bold">Manager rating distribution</h3></div><span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">Average {scored.length ? (scored.reduce((s,r) => s+r.score!,0)/scored.length).toFixed(1) : '—'} / 100</span></div><div className="space-y-5">{ratings.map(([label,low,high]) => { const count = scored.filter(r => r.score! >= low && (high === 100 ? r.score! <= high : r.score! < high)).length; return <div key={label} className="grid grid-cols-[150px_1fr_30px] items-center gap-3 text-xs"><span>{label}</span><span className="h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${percent(count,scored.length)}%` }} /></span><strong className="text-right">{count}</strong></div>; })}</div><p className="mt-5 text-xs text-slate-500">Score bands are based on the final score out of 100. Unscored reviews are excluded.</p></Card>
      </div>
      <Card className="overflow-auto"><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Team view</p><h3 className="mb-4 mt-2 text-lg font-bold">Completion by department</h3><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr>{['Department','Reviews','Self review','Manager review','Closed','Avg. score / 100'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{departments.map(d => <tr key={d.name} className="border-t border-slate-100 text-slate-600"><td className="p-3 font-semibold">{d.name}</td><td className="p-3">{d.count}</td><td className="p-3">{d.self}%</td><td className="p-3">{d.manager}%</td><td className="p-3">{d.closed}%</td><td className="p-3">{d.score}</td></tr>)}</tbody></table></Card>
    </>}
  </>;
}
