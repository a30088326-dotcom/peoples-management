import { Loader2, XCircle } from 'lucide-react';

export default function VerificationRejectDialog({ note, onNoteChange, busy, error, refreshRequired, onCancel, onConfirm, onRefresh }: {
  note: string; onNoteChange: (value: string) => void; busy: boolean; error: string; refreshRequired: boolean;
  onCancel: () => void; onConfirm: () => void; onRefresh: () => void;
}) {
  return <div className="modal-overlay" onClick={onCancel}>
    <section role="dialog" aria-modal="true" aria-labelledby="document-rejection-title" className="card anim-scale-in w-full max-w-md" onClick={event => event.stopPropagation()}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600"><XCircle size={24} /></div>
      <h3 id="document-rejection-title" className="mb-1 text-center text-lg font-bold text-slate-800">Reject Document</h3>
      <p className="mb-4 text-center text-xs text-slate-500">Provide a reason so the candidate knows what to resubmit.</p>
      {error && <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}
        {refreshRequired && <button type="button" className="btn-secondary mt-2" onClick={onRefresh} disabled={busy}>Refresh documents</button>}
      </div>}
      <label htmlFor="document-rejection-note" className="input-label">Rejection Reason</label>
      <textarea id="document-rejection-note" className="input-field" rows={3} maxLength={5000} value={note}
        onChange={event => onNoteChange(event.target.value)} disabled={busy} placeholder="Explain what needs to be corrected…" />
      <div className="mt-4 flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn-danger flex-1" onClick={onConfirm} disabled={busy || refreshRequired || !note.trim()}>
          {busy && <Loader2 size={14} className="animate-spin" />} {busy ? 'Saving…' : 'Confirm Rejection'}
        </button>
      </div>
    </section>
  </div>;
}
