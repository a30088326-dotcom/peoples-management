import { ArrowRight, CheckCircle2, ClipboardList, MessageSquare, Target, TrendingUp } from 'lucide-react';
import type { ReviewSummary, Section, Workspace } from '../types';
import { Badge, Button, Card, Empty, Heading, Progress } from './UI';
import { dateLabel, stage } from '../utils/format';

type Props = { data: Workspace; reviews: ReviewSummary[]; navigate: (section: Section) => void; open: (id: string) => void };

function EmployeeOverview({ data, reviews, navigate, open }: Props) {
  const own = reviews.filter(review => review.employeeId === data.actor.employeeId);
  const current = own.find(review => !review.closedAt) || own[0];
  return <>
    <Heading title="My performance" description="Your goals, self-assessment and development plan in one place." />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'My reviews', value: own.length, note: 'Assigned to my account', icon: ClipboardList },
        { label: 'Assigned goals', value: own.reduce((sum, review) => sum + review.goals, 0), note: 'Across my reviews', icon: Target },
        { label: 'Self-assessment', value: current?.selfSharedAt ? 'Shared' : current ? 'To do' : '—', note: current ? `Due ${dateLabel(current.dueDate)}` : 'No active review', icon: CheckCircle2 },
        { label: 'Development actions', value: own.reduce((sum, review) => sum + review.developmentActions, 0), note: 'My growth plan', icon: TrendingUp },
      ].map(metric => <Card key={metric.label}><metric.icon size={20} className="mb-3 text-blue-500" /><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="my-2 text-2xl font-bold text-slate-800">{metric.value}</p><p className="text-xs text-slate-400">{metric.note}</p></Card>)}
    </div>
    {current ? <Card className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge>{current.closedAt ? 'Closed' : stage(current)}</Badge><h3 className="mt-3 text-lg font-bold text-slate-800">{current.cycleName}</h3><p className="mt-1 text-sm text-slate-500">Your review · {current.employee?.employeeNumber} · Due {dateLabel(current.dueDate)}</p></div><Progress value={current.progress} /></div>
      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => open(current.id)}>My goals<ArrowRight size={15} /></Button><Button secondary onClick={() => navigate('self')}>{current.closedAt ? 'View result & acknowledge' : 'My self-assessment'}</Button><Button secondary onClick={() => navigate('development')}>My development plan</Button></div>
      {current.closedAt && <p className="mt-4 text-sm text-slate-600">Final score: {current.score ?? 'Not available'}{current.acknowledgedAt ? ' · Acknowledged' : ' · Awaiting your acknowledgement'}</p>}
    </Card> : <Empty title="No performance review assigned yet">Your goals and self-assessment will appear after HR launches a cycle that includes you.</Empty>}
    {data.invitations.length > 0 && <Card className="mt-5"><h3 className="font-semibold text-slate-800">Feedback requests for you</h3><p className="my-2 text-sm text-slate-500">{data.invitations.filter(invitation => invitation.status === 'PENDING').length} request(s) awaiting your response.</p><Button secondary onClick={() => navigate('feedback')}>Open 360° feedback</Button></Card>}
  </>;
}

function TeamOverview({ data, reviews, navigate, open }: Props) {
  const team = reviews.filter(review => review.employeeId !== data.actor.employeeId);
  const closed = team.filter(review => review.closedAt).length;
  const actions = team.filter(review => review.canManage && review.selfSharedAt && !review.managerSharedAt).length;
  const pending = team.reduce((sum, review) => sum + review.pendingFeedback, 0);
  return <>
    <Heading title="Team performance" description="Only reviews in your reporting team appear here."><Button onClick={() => navigate('employees')}>Team reviews<ArrowRight size={16} /></Button></Heading>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Team reviews', value: team.length, note: 'In your reporting scope', icon: ClipboardList },
      { label: 'Closed', value: closed, note: `${team.length - closed} still open`, icon: CheckCircle2 },
      { label: 'Manager actions', value: actions, note: 'Self-assessments shared and ready', icon: Target },
      { label: '360° pending', value: pending, note: 'Team feedback requests', icon: MessageSquare },
    ].map(metric => <Card key={metric.label}><metric.icon size={20} className="mb-3 text-blue-500" /><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="my-2 text-3xl font-bold text-slate-800">{metric.value}</p><p className="text-xs text-slate-400">{metric.note}</p></Card>)}</div>
    {!team.length ? <Empty title="No team reviews yet">HR must launch a review cycle for your reporting team.</Empty> : <Card><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-800">Team reviews requiring attention</h3><Button secondary onClick={() => navigate('reports')}>Team reports</Button></div>{team.filter(review => !review.closedAt).slice(0, 8).map(review => <button key={review.id} onClick={() => open(review.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t border-slate-100 py-4 text-left"><span><span className="block text-sm font-semibold text-slate-700">{review.employee?.name}</span><span className="text-xs text-slate-400">{stage(review)} · due {dateLabel(review.dueDate)}</span></span><span className="w-28"><Progress value={review.progress} /></span></button>)}{team.every(review => review.closedAt) && <p className="text-sm text-emerald-600">All team reviews are closed.</p>}</Card>}
  </>;
}

function OrganizationOverview({ data, reviews, navigate, open }: Props) {
  const closed = reviews.filter(review => review.closedAt).length;
  const rate = reviews.length ? Math.round(closed / reviews.length * 100) : 0;
  const self = reviews.filter(review => review.selfSharedAt).length;
  const manager = reviews.filter(review => review.selfSharedAt && !review.managerSharedAt).length;
  const pending = data.invitations.filter(invitation => invitation.status === 'PENDING').length;
  const focus = reviews.find(review => !review.closedAt && review.employee) || reviews.find(review => review.employee) || reviews[0];
  const firstName = data.employees.find(e => e.id === data.actor.employeeId)?.name.split(' ')[0];
  const localDay = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Colombo' }).format(new Date());
  return <>
    <p className="mb-2 text-xs font-black uppercase tracking-[.15em] text-blue-600">{localDay}</p><Heading title={`Good morning${firstName ? `, ${firstName}` : ''}`} description="Here is what needs attention across your performance reviews."><Button secondary onClick={() => navigate('reports')}>View reports</Button><Button onClick={() => navigate('employees')}>Continue reviews<ArrowRight size={16} /></Button></Heading>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Cycle completion', value: `${rate}%`, note: `${closed} of ${reviews.length} reviews closed`, icon: CheckCircle2 },
      { label: 'Self-assessments', value: self, note: `${reviews.length - self} still to share`, icon: ClipboardList },
      { label: 'Manager actions', value: manager, note: 'Waiting for manager assessment', icon: Target },
      { label: '360° pending', value: reviews.reduce((sum, review) => sum + review.pendingFeedback, 0), note: `${pending} feedback requests for you`, icon: MessageSquare },
    ].map(metric => <Card key={metric.label}><metric.icon size={20} className="mb-3 text-blue-500" /><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="my-2 text-3xl font-bold text-slate-800">{metric.value}</p><p className="text-xs text-slate-400">{metric.note}</p></Card>)}</div>
    <div className="mb-6 grid gap-5 xl:grid-cols-2"><Card><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Employee journey</p><h3 className="mt-2 text-lg font-bold text-slate-800">{focus?.employee?.name ? `${focus.employee.name}’s review` : 'Review journey'}</h3></div>{focus && <Badge>{focus.closedAt ? 'Closed' : stage(focus)}</Badge>}</div>{([['Goals & check-ins', focus ? `${focus.goals} goals assigned · ${focus.progress}% progress` : 'Agree outcomes and record progress', 'goals'], ['Self-assessment', focus?.selfSharedAt ? 'Shared with manager' : 'Waiting for employee', 'self'], ['Manager assessment', focus?.managerSharedAt ? 'Shared' : 'Waiting for manager', 'manager'], ['360° feedback', focus ? `${focus.receivedFeedback} received · ${focus.pendingFeedback} pending` : 'Invite peers and collect responses', 'feedback'], ['Close & acknowledge', focus?.closedAt ? 'Review closed · read-only' : 'Unlocks after required steps', 'close']] as [string, string, Section][]).map(([name, description, section], index) => <button key={name} onClick={() => navigate(section)} className="flex w-full items-center gap-3 rounded-xl border-b border-slate-100 p-3 text-left hover:bg-blue-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{index + 1}</span><span className="flex-1"><span className="block text-sm font-semibold text-slate-700">{name}</span><span className="text-xs text-slate-500">{description}</span></span><ArrowRight size={14} className="text-slate-400" /></button>)}</Card><Card><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">How scoring works · Example</p><h3 className="mt-3 text-xl font-bold text-slate-800">Progress is not the final score</h3><div className="mt-6 grid grid-cols-3 items-center gap-2 text-center"><div><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-xl font-bold">0%</div><p className="mt-2 text-xs font-bold">Goal progress</p></div><div><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-700">4/5</div><p className="mt-2 text-xs font-bold">Manager rating</p></div><div><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-600">32</div><p className="mt-2 text-xs font-bold">Performance points</p></div></div><p className="mt-5 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">Reaching the deadline does not make progress 100%. Progress changes only when work or milestones are updated.</p><p className="mt-4 text-xs text-slate-500">Example: 4 ÷ 5 × 40 = 32 goal points. Peer feedback is separate from the manager score.</p></Card></div>
    {!reviews.length ? <Empty title="Performance workspace is ready">{data.actor.admin ? <><p>Create a template, then launch a review cycle.</p><Button className="mt-4" onClick={() => navigate('templates')}>Set up a template</Button></> : 'HR will launch a review cycle for employees.'}</Empty> : <Card><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-800">Reviews requiring attention</h3><Button secondary onClick={() => navigate('reports')}>View reports</Button></div>{reviews.filter(review => !review.closedAt).slice(0, 6).map(review => <button key={review.id} onClick={() => open(review.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t border-slate-100 py-4 text-left"><span><span className="block text-sm font-semibold text-slate-700">{review.employee?.name}</span><span className="text-xs text-slate-400">{stage(review)} · due {dateLabel(review.dueDate)}</span></span><span className="w-28"><Progress value={review.progress} /></span></button>)}</Card>}
  </>;
}

export default function Overview(props: Props) {
  if (props.data.actor.admin || props.data.actor.executive) return <OrganizationOverview {...props} />;
  if (props.data.actor.manager) return <TeamOverview {...props} />;
  return <EmployeeOverview {...props} />;
}
