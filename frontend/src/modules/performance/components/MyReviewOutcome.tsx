import type { Review, ReviewAction } from '../types';
import { dateLabel } from '../utils/format';
import { Badge, Button, Card } from './UI';

/** Employee-facing results, without exposing manager-only closure controls. */
export default function MyReviewOutcome({ review, action }: { review: Review; action: ReviewAction }) {
  if (!review.isOwner || !review.manager.sharedAt) return null;
  return <Card className="mb-5 !border-blue-200 !bg-blue-50/40">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-800">My review outcome</h3><Badge>{review.closedAt ? 'Final result' : 'Manager assessment shared'}</Badge></div>
    <p className="mt-2 text-sm text-slate-500">Reporting manager: {review.employee?.managerName || 'HR'} · Shared {dateLabel(review.manager.sharedAt)}</p>
    <p className="my-4 text-2xl font-bold text-blue-700">{review.closedAt ? review.finalScore : review.scores?.total} / 100 <span className="text-sm font-normal text-slate-500">{review.closedAt ? 'Final score' : 'Provisional · review not closed'}</span></p>
    <p className="whitespace-pre-wrap text-sm text-slate-700">{review.manager.comment}</p>
    <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-blue-700">View manager ratings and answers</summary><div className="mt-3 space-y-3 text-sm text-slate-600">
      {review.goals.map(g => <p key={g.id}>{g.title}: <strong>{review.manager.goalRatings[g.id] ?? '—'} / 5</strong> · {g.weight}% weight</p>)}
      {review.template.competencies.map(c => <p key={c.id}>{c.name}: <strong>{review.manager.competencyRatings[c.id] ?? '—'} / 5</strong> · {c.weight}% weight</p>)}
      {review.template.questions.map(q => <div key={q.id}><p className="font-semibold">{q.prompt}</p><p className="mt-1 whitespace-pre-wrap">{review.manager.answers[q.id] || '—'}</p></div>)}
    </div></details>
    {review.closedAt && <div className="mt-5 space-y-3 border-t border-blue-100 pt-4">
      <p className="text-sm text-slate-600">Review meeting: {dateLabel(review.meetingDate)} · Closed {dateLabel(review.closedAt)}</p>
      <p className="whitespace-pre-wrap text-sm text-slate-600">{review.meetingNotes}</p>
      {review.feedback.filter(f => f.status === 'SUBMITTED').map(f => <details key={f.id}><summary className="cursor-pointer text-sm font-semibold text-blue-700">360° feedback · {f.relationship}</summary><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">Strengths: {f.strengths}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">Development suggestions: {f.improvements}</p></details>)}
      {review.acknowledgedAt ? <p className="text-sm font-semibold text-emerald-700">Receipt acknowledged {dateLabel(review.acknowledgedAt)}</p> : <><p className="text-sm text-slate-600">Acknowledge that you have read this review. Acknowledgement does not mean agreement with its ratings.</p><Button onClick={() => action('acknowledge')}>Acknowledge receipt</Button></>}
    </div>}
  </Card>;
}
