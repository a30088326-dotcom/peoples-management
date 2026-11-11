import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import type { Section } from '../types';
import { performanceApi as api } from '../api/performanceApi';
import { usePerformance } from '../hooks/usePerformance';
import { matchesEmployee } from '../utils/employeeSearch';
import { dateLabel } from '../utils/format';
import { ActionContext, Button, Card, Empty, inputClass, Modal } from '../components/UI';
import Overview from '../components/Overview';
import Cycles from '../components/Cycles';
import Templates from '../components/Templates';
import ReviewList from '../components/ReviewList';
import GoalLibrary from '../components/GoalLibrary';
import GoalCheckins from '../components/GoalCheckins';
import AssessmentForm from '../components/AssessmentForm';
import FeedbackPanel from '../components/FeedbackPanel';
import Development from '../components/Development';
import CloseReview from '../components/CloseReview';
import Reports from '../components/Reports';
import HistoricalPerformance from '../components/HistoricalPerformance';
import { sectionsFor } from '../roleSections';
import { performanceNavigation, performanceHash, performanceSectionFromHash } from '../navigation';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

const detailSections: Section[] = ['goals', 'self', 'manager', 'feedback', 'development', 'close'];
const sectionFromHash = (): Section => performanceSectionFromHash(window.location.hash);
export default function PerformanceHub() {
  const p = usePerformance(); const { data, review } = p;
  const [section, setSection] = useState<Section>(sectionFromHash);
  const allowedSections = useMemo(() => data ? sectionsFor(data) : ['overview'] as Section[], [data]);
  const currentSection: Section = allowedSections.includes(section) ? section : 'overview';
  const [employeeSearch,setEmployeeSearch]=useState('');
  const [cycleId, setCycleId] = useState(''); const [reviewId, setReviewId] = useState('');
  const initialCycleSelected = useRef(false);
  const requestedReviewHandled = useRef('');
  useEffect(() => {
    const selectRequested = () => {
      const requested = new URLSearchParams(window.location.search).get('review');
      if (!requested || !data || requestedReviewHandled.current === requested) return;
      const found = data.reviews.find(r => r.id === requested); if (!found) return;
      requestedReviewHandled.current = requested; initialCycleSelected.current = true;
      setCycleId(found.cycleId); setReviewId(found.id);
    };
    selectRequested(); window.addEventListener('popstate', selectRequested);
    return () => window.removeEventListener('popstate', selectRequested);
  }, [data]);
  const orderedCycles = useMemo(() => [...(data?.cycles || [])].sort((a, b) =>
    Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') || b.createdAt.localeCompare(a.createdAt) || b.startDate.localeCompare(a.startDate)), [data]);
  useEffect(() => {
    if (!data || initialCycleSelected.current) return;
    initialCycleSelected.current = true;
    setCycleId(orderedCycles.find(c => c.status === 'ACTIVE')?.id || orderedCycles[0]?.id || '');
  }, [data, orderedCycles]);
  const [goalsMode, setGoalsMode] = useState<'library' | 'assigned'>('library'); const [inbox, setInbox] = useState(false);
  const navigate = (next: Section) => { if (!allowedSections.includes(next)) return; p.clearMessages(); setSection(next); window.history.pushState({}, '', `/performance#${performanceHash(next)}`); window.dispatchEvent(new HashChangeEvent('hashchange')); };
  useEffect(() => { const handler = () => { p.clearMessages(); setSection(sectionFromHash()); }; window.addEventListener('hashchange', handler); window.addEventListener('popstate', handler); return () => { window.removeEventListener('hashchange', handler); window.removeEventListener('popstate', handler); }; }, []);
  useEffect(() => { if (data && section !== currentSection) { setSection('overview'); window.history.replaceState({}, '', `${window.location.pathname}#dashboard`); window.dispatchEvent(new HashChangeEvent('hashchange')); } }, [data, section, currentSection]);
  const reviews = data?.reviews.filter(r => !cycleId || r.cycleId === cycleId) || [];
  const managerOnly = data?.actor.manager && !data.actor.admin && !data.actor.executive;
  const eligible = (r: (typeof reviews)[number]) =>
    (currentSection !== 'self' || data?.actor.admin || data?.actor.executive || r.employeeId === data?.actor.employeeId) &&
    (!(currentSection === 'manager' || currentSection === 'close') || !managerOnly || r.canManage);
  const selectable = reviews.filter(r => eligible(r) && (r.id === reviewId || matchesEmployee(r.employee,employeeSearch)));
  useEffect(() => {
    if (!data || !detailSections.includes(currentSection)) return;
    const candidates = data.reviews.filter(r => (!cycleId || r.cycleId === cycleId) && eligible(r));
    if (!candidates.some(r => r.id === reviewId)) setReviewId(candidates[0]?.id || '');
  }, [cycleId, currentSection, data, reviewId]);
  useEffect(() => { if (detailSections.includes(currentSection)) void p.selectReview(reviewId); }, [reviewId, currentSection, p.selectReview]);
  const open = (id: string) => { setReviewId(id); navigate('goals'); setGoalsMode('assigned'); };
  if (p.loading) return <div className="p-12 text-center text-sm text-slate-500">Loading performance workspace…</div>;
  if (!data) return <div className="p-8"><Empty title="Performance could not be loaded"><p role="alert">{p.error || 'Check that the HR backend is running.'}</p><Button className="mt-4" onClick={() => window.location.reload()}>Try again</Button></Empty></div>;
  const setupAccess = data.actor.admin || data.actor.manager || data.actor.executive;
  const needsReview = detailSections.includes(currentSection) && !(currentSection === 'goals' && goalsMode === 'library' && setupAccess) && currentSection !== 'feedback';
  const render = () => {
    if (needsReview && p.reviewLoading) return <Card>Loading employee review…</Card>;
    if (needsReview && (!review || review.id !== reviewId)) return <Empty title={currentSection === 'self' && !data.actor.admin && !data.actor.executive ? 'No self-assessment assigned to your account' : 'No employee review selected'}>Select a launched cycle and an employee review.</Empty>;
    switch (currentSection) {
      case 'overview': return <Overview data={data} reviews={reviews} navigate={navigate} open={open} />;
      case 'cycles': return <Cycles data={data} run={p.run} select={id => { setCycleId(id); navigate('employees'); }} />;
      case 'templates': return <Templates templates={data.templates} run={p.run} admin={data.actor.admin} />;
      case 'employees': return <ReviewList reviews={managerOnly ? reviews.filter(r => r.employeeId !== data.actor.employeeId) : reviews} open={open} />;
      case 'goals': return goalsMode === 'library' && setupAccess ? <GoalLibrary key={cycleId} data={data} run={p.run} cycleId={cycleId} /> : <GoalCheckins key={review!.id} review={review!} action={p.action} />;
      case 'self': return <AssessmentForm review={review!} kind="self" action={p.action} options={reviews.filter(r => r.employee && (data.actor.admin || data.actor.executive || r.employeeId === data.actor.employeeId))} cycles={orderedCycles} cycleId={cycleId || review!.cycleId} onCycleChange={id => { setCycleId(id); setReviewId(''); }} onSelectReview={setReviewId} onOpenFeedback={() => navigate('feedback')} />;
      case 'manager': return <AssessmentForm review={review!} kind="manager" action={p.action} options={reviews.filter(r => r.employee && (r.canManage || data.actor.admin || data.actor.executive))} cycles={orderedCycles} cycleId={cycleId} onCycleChange={id => { setCycleId(id); setReviewId(''); }} onSelectReview={setReviewId} onOpenFeedback={() => navigate('feedback')} />;
      case 'feedback': return <FeedbackPanel data={data} review={review?.id === reviewId ? review : null} action={p.action} run={p.run} />;
      case 'development': return <Development key={review!.id} review={review!} action={p.action} />;
      case 'close': return <CloseReview key={review!.id} review={review!} action={p.action} navigate={navigate} />;
      case 'reports': return <Reports reviews={managerOnly ? reviews.filter(r => r.employeeId !== data.actor.employeeId) : reviews} />;
      case 'history': return <HistoricalPerformance />;
    }
  };
  const roleLabel = data.actor.admin ? 'HR Admin' : data.actor.executive ? 'Executive' : data.actor.manager ? 'Manager' : 'Employee';
  const title = performanceNavigation.find(t => t.id === currentSection)?.label || 'Overview';
  return <ActionContext.Provider value={{ busy: p.busy, error: p.error }}><div className="workspace-frame bg-[#f3f6f8] text-[#102c40]">
    <div className="workspace-frame"><header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e4e9] bg-white px-5 py-4 md:px-9"><div><p className="text-xs text-slate-500">Performance / {title}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1></div><div className="flex items-center gap-3"><span className="rounded-xl border border-[#d9e4e9] px-4 py-3 text-sm"><span className="mr-4 text-slate-500">View as</span><strong>{roleLabel}</strong></span><Button secondary aria-label="Performance notifications" onClick={() => setInbox(true)}><Bell size={17}/>{data.notifications.filter(n => !n.readAt).length}</Button></div></header>
      <WorkspaceScrollArea resetKey={currentSection} label="Performance content"><div className="mx-auto max-w-[1600px] px-5 py-7 md:px-9">{currentSection !== 'self' && currentSection !== 'manager' && <div className="mb-6 flex flex-wrap items-end gap-3"><label className="min-w-0 sm:min-w-64 flex-1 text-sm font-semibold text-slate-600">Review cycle<select className={`${inputClass} mt-2`} value={cycleId} disabled={p.busy} onChange={e => { p.clearMessages(); setCycleId(e.target.value); setReviewId(''); }}><option value="">All cycles</option>{orderedCycles.map(c => <option key={c.id} value={c.id}>{c.name} · {c.status === 'ACTIVE' && c.startDate > new Date().toISOString().slice(0,10) ? 'Scheduled' : c.status}</option>)}</select></label><Button secondary onClick={() => { void p.run(async () => undefined, 'Workspace refreshed.'); }}><RefreshCw size={16}/>Refresh</Button></div>}
        {data.cycles.some(c => c.demo && (!cycleId || c.id === cycleId)) && <div role="note" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900"><strong>Practice data:</strong> employee names and managers are real, but sample goals, ratings and comments are fictional. Changes are saved.</div>}
        {p.error && <p role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{p.error}</p>}{p.notice && <p role="status" className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{p.notice}</p>}{p.busy && <p role="status" className="mb-3 text-xs text-blue-600">Saving and syncing…</p>}
        {currentSection === 'goals' && setupAccess && <div className="mb-4 flex gap-2"><Button secondary={goalsMode !== 'library'} onClick={() => setGoalsMode('library')}>Goal library & assignment</Button><Button secondary={goalsMode !== 'assigned'} onClick={() => setGoalsMode('assigned')}>Employee goals & check-ins</Button></div>}
        {detailSections.includes(currentSection) && currentSection !== 'self' && currentSection !== 'manager' && !(currentSection === 'goals' && goalsMode === 'library') && (currentSection !== 'feedback' || setupAccess) && <Card className="mb-5">{setupAccess && <label className="mb-3 block text-sm font-semibold text-slate-600">Search employee review<input className={`${inputClass} mt-2`} value={employeeSearch} onChange={e=>setEmployeeSearch(e.target.value)} placeholder="Name, employee number, designation or department"/></label>}<label className="text-sm font-semibold text-slate-600">{setupAccess ? 'Employee review' : 'My review'}<select className={`${inputClass} mt-2`} value={reviewId} disabled={p.busy} onChange={e => setReviewId(e.target.value)}><option value="">Select a review</option>{selectable.map(r => <option key={r.id} value={r.id}>{r.employee?.name || 'Employee'} · {r.employee?.employeeNumber} · {r.cycleName}</option>)}</select></label>{review && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{review.employee?.employeeNumber} · {review.employee?.department} · Manager: {review.employee?.managerName || 'Not assigned'}</span>{review.canManage && !review.closedAt && <Button secondary onClick={() => p.action('remind')}>Send in-app reminder</Button>}</div>}</Card>}
        {render()}
      </div></WorkspaceScrollArea>
    </div>
    {inbox && <Modal title="Performance notifications" onClose={() => setInbox(false)}>{!data.notifications.length ? <p className="text-sm text-slate-500">You have no performance notifications.</p> : data.notifications.map(n => <div key={n.id} className="border-b border-slate-100 py-4"><p className={`text-sm ${n.readAt ? 'text-slate-500' : 'font-semibold text-slate-700'}`}>{n.message}</p><p className="mt-1 text-xs text-slate-400">{dateLabel(n.at)}</p>{!n.readAt && <Button secondary className="mt-2" onClick={() => p.run(() => api.readNotification(n.id), 'Notification marked as read.')}>Mark as read</Button>}</div>)}</Modal>}
  </div></ActionContext.Provider>;
}
