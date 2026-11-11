import type { ReviewSummary, Template } from '../types';
export const dateLabel = (value?: string | null) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function stage(r: ReviewSummary) { return r.closedAt ? 'Closed' : !r.selfSharedAt ? 'Self review' : !r.managerSharedAt ? 'Manager review' : r.pendingFeedback ? '360° pending' : 'Ready for checks'; }
export const uid = () => crypto.randomUUID();
export function newTemplate(): Template {
  return { id: uid(), name: 'Annual Performance Review', description: 'Goals, achievements and competencies.', published: false, goalWeight: 70,
    competencies: ['Ownership', 'Collaboration', 'Technical craft'].map(name => ({ id: uid(), name, description: '', weight: 10 })),
    questions: [
      ['Goals & outcomes', 'Summarise progress and business impact against the agreed goals.'],
      ['Key achievements', 'What were the most important achievements and their impact?'],
      ['Overall reflection', 'What went well, and what did you learn from challenges?'],
    ].map(([section, prompt]) => ({ id: uid(), section, prompt, required: true })),
  };
}
export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
