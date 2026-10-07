import { useEffect, useMemo, useState } from 'react';
import { performanceApi } from '../api/performanceApi';
import type { HistoricalPerformance as History } from '../types';

const showDate = (value: string | null) => value ? new Date(value).toLocaleDateString('en-GB') : '—';

export default function HistoricalPerformance() {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState('');
  const [cycleId, setCycleId] = useState('');
  useEffect(() => {
    let active = true;
    performanceApi.history().then(data => { if (active) setHistory(data); }).catch(() => {
      if (active) setError('Historical performance records could not be loaded.');
    });
    return () => { active = false; };
  }, []);
  const reviews = useMemo(() => history?.reviews.filter(review => !cycleId || review.cycleId === cycleId) || [], [history, cycleId]);
  const goals = useMemo(() => history?.goals.filter(goal => !cycleId || goal.cycleId === cycleId) || [], [history, cycleId]);
  if (error) return <p role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-700">{error}</p>;
  if (!history) return <p className="p-5 text-sm text-slate-500">Loading historical performance records…</p>;
  const cycleName = (id: string) => history.cycles.find(cycle => cycle.id === id)?.name || 'Previous cycle';
  return <div className="space-y-5">
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
      <h2 className="text-lg font-bold text-slate-800">Historical performance records</h2>
      <p className="mt-1 text-sm text-slate-600">Existing reviews and goals are preserved here as read-only records. New reviews use the current workflow.</p>
    </div>
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="min-w-64 flex-1 text-sm font-semibold text-slate-600">Historical cycle
        <select value={cycleId} onChange={event => setCycleId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All cycles</option>{history.cycles.map(cycle => <option key={cycle.id} value={cycle.id}>{cycle.name} · {cycle.status}</option>)}
        </select>
      </label>
      <span className="text-sm text-slate-500">{reviews.length} reviews · {goals.length} goals</span>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-bold text-slate-800">Reviews</h3>
      {!reviews.length ? <p className="text-sm text-slate-500">No historical reviews in this view.</p> : <div className="space-y-3">{reviews.map(review =>
        <details key={review.id} className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer font-semibold text-slate-800">{review.employee?.name || 'Employee'} · {cycleName(review.cycleId)} <span className="ml-2 text-xs font-medium text-slate-500">{review.status.replace(/_/g, ' ')} · Score {review.managerScore ?? '—'}</span></summary>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p><strong>Employee no:</strong> {review.employee?.employeeNumber || '—'}</p><p><strong>Reviewer:</strong> {review.reviewerName || '—'}</p>
            <p><strong>Submitted:</strong> {showDate(review.submittedAt)}</p><p><strong>Reviewed:</strong> {showDate(review.reviewedAt)}</p>
            <div className="rounded-lg bg-slate-50 p-3"><strong>Self-assessment</strong><p className="mt-2 whitespace-pre-wrap">{review.selfAssessment || 'Not submitted'}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><strong>Manager assessment</strong><p className="mt-2 whitespace-pre-wrap">{review.managerReview || 'Not shared'}</p></div>
          </div>
        </details>)}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-bold text-slate-800">Goals</h3>
      {!goals.length ? <p className="text-sm text-slate-500">No historical goals in this view.</p> : <div className="space-y-3">{goals.map(goal =>
        <div key={goal.id} className="rounded-xl border border-slate-200 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-slate-800">{goal.title}</p><span className="text-blue-700">{Number(goal.progress)}% complete</span></div>
          <p className="mt-1 text-slate-500">{goal.employeeName} · {cycleName(goal.cycleId)} · Due {showDate(goal.dueDate)}</p>
          {goal.description && <p className="mt-2 text-slate-600">{goal.description}</p>}
          {goal.target && <p className="mt-2 text-slate-600"><strong>Target:</strong> {goal.target}</p>}
          {history.checkIns.filter(checkIn => checkIn.goalId === goal.id).map(checkIn => <div key={checkIn.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-600">
            <strong>Check-in · {showDate(checkIn.checkInDate)} · {Number(checkIn.progress)}%</strong>
            {checkIn.comment && <p className="mt-1 whitespace-pre-wrap">{checkIn.comment}</p>}
            {checkIn.blocker && <p className="mt-1"><strong>Blocker:</strong> {checkIn.blocker}</p>}
          </div>)}
        </div>)}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-bold text-slate-800">Feedback</h3>
      {!history.feedback.filter(item => !cycleId || item.cycleId === cycleId).length ? <p className="text-sm text-slate-500">No historical feedback in this view.</p> :
        <div className="space-y-3">{history.feedback.filter(item => !cycleId || item.cycleId === cycleId).map(item =>
          <div key={item.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">{item.employeeName} · {cycleName(item.cycleId)}</p>
            <p className="mt-2 whitespace-pre-wrap">{item.feedback}</p>
          </div>)}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-bold text-slate-800">Development plans</h3>
      {!history.development.filter(item => !cycleId || item.cycleId === cycleId).length ? <p className="text-sm text-slate-500">No historical plans in this view.</p> :
        <div className="space-y-3">{history.development.filter(item => !cycleId || item.cycleId === cycleId).map(item =>
          <div key={item.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">{item.area} · {item.employeeName}</p>
            <p className="mt-1 text-slate-500">{cycleName(item.cycleId)} · {item.status} · Target {showDate(item.targetDate)}</p>
            <p className="mt-2 whitespace-pre-wrap">{item.actionPlan}</p>
          </div>)}</div>}
    </section>
  </div>;
}
