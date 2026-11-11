import { AlertTriangle, CheckCircle2, Loader2, ZoomIn } from 'lucide-react';
import { useProtectedFile, ProtectedFileLink } from '../../../../components/ProtectedFile';
import { documentColor, documentIcon, documentLabel, type VerificationDocument } from './documentPresentation';

export default function VerificationPreview({ document, busy, refreshRequired, onApprove, onReject, onSendLink }: {
  document: VerificationDocument; busy: boolean; refreshRequired: boolean;
  onApprove: () => void; onReject: () => void; onSendLink: () => void;
}) {
  const preview = useProtectedFile(document.fileUrl);
  const label = documentLabel(document);
  const color = documentColor(document.type);
  return <section className="workspace-frame verification-preview" aria-label="Selected document preview">
    <header className="verification-panel-header">
      <div className="flex min-w-0 items-center gap-3">
        <span className="verification-document-icon" style={{ color, background: color + '15' }}>{documentIcon(document.type)}</span>
        <div className="min-w-0"><h2 className="truncate">{label}</h2><p className="truncate text-xs text-slate-500" title={document.fileName}>{document.fileName || 'Uploaded file'} · {document.fileSize || 'Pending review'}</p></div>
      </div>
      <ProtectedFileLink value={document.fileUrl} className="app-action-icon shrink-0" title="View full document"><ZoomIn size={18} /></ProtectedFileLink>
    </header>
    <div className="verification-preview-stage" aria-busy={!preview.url && !preview.error}>
      {preview.error ? <p role="alert" className="p-5 text-center text-sm text-red-600">{preview.error}</p> : !preview.url ?
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Loading document…</p> :
        (/pdf/i.test(document.fileType || '') || /\.pdf$/i.test(document.fileName || '')) ? <iframe src={preview.url} title={label} /> :
        <a href={preview.url} target="_blank" rel="noreferrer" aria-label={'View ' + label + ' full screen'}><img src={preview.url} alt={label} /></a>}
    </div>
    {document.status === 'REJECTED' && <div className="verification-preview-note bg-red-50 text-red-700" role="note">
      <AlertTriangle size={16} className="shrink-0" /><div><p className="font-semibold">Document Rejected</p><p>Reason: {document.rejectionNote || 'Not provided'}</p></div>
    </div>}
    {document.status === 'APPROVED' && <div className="verification-preview-note bg-emerald-50 text-emerald-700" role="note">
      <CheckCircle2 size={16} className="shrink-0" /><div><p className="font-semibold">Document Verified & Approved</p>{document.verifiedAt && <p>Verified on {new Date(document.verifiedAt).toLocaleDateString()}</p>}</div>
    </div>}
    <footer className="verification-preview-actions">
      {document.status === 'PENDING' ? <>
        <button type="button" className="btn-danger flex-1" onClick={onReject} disabled={busy || refreshRequired}>Reject</button>
        <button type="button" className="btn-primary flex-1" onClick={onApprove} disabled={busy || refreshRequired}>{busy ? 'Saving…' : 'Approve Document'}</button>
      </> : document.status === 'REJECTED' ? <button type="button" className="btn-secondary flex-1" onClick={onSendLink} disabled={busy}>{busy ? 'Sending…' : 'Send Re-upload Link'}</button> :
        <p className="text-xs text-slate-500">Review complete. Only pending submissions can be approved or rejected.</p>}
    </footer>
  </section>;
}
