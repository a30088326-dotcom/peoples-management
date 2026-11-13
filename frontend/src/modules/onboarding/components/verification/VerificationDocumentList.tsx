import { FileText } from 'lucide-react';
import WorkspaceScrollArea from '../../../../components/WorkspaceScrollArea';
import { documentLabel, documentIcon, documentColor, documentStatus, type VerificationDocument } from './documentPresentation';

export default function VerificationDocumentList({ documents, selectedId, candidateId, disabled, pendingCount,
  approvingAll, refreshRequired, onApproveAll, onSelect }: {
  documents: VerificationDocument[]; selectedId?: string; candidateId: string; disabled?: boolean;
  pendingCount: number; approvingAll: boolean; refreshRequired: boolean;
  onApproveAll: () => void; onSelect: (document: VerificationDocument) => void;
}) {
  return <section className="workspace-frame verification-document-list" aria-labelledby="submitted-documents-title">
    <header className="verification-panel-header">
      <h2 id="submitted-documents-title">Submitted Documents</h2>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-xs text-slate-500" aria-label={`${documents.length} submitted documents`}>{documents.length}</span>
        <button type="button" className="btn-primary app-action-small whitespace-nowrap" onClick={onApproveAll}
          disabled={disabled || refreshRequired || pendingCount === 0} aria-busy={approvingAll}
          title={pendingCount === 0 ? 'No pending documents to approve' : undefined}>
          {approvingAll ? 'Approving…' : 'Approve All'}
        </button>
      </div>
    </header>
    <WorkspaceScrollArea label="Submitted documents" resetKey={candidateId}>
      {documents.map(document => {
        const status = documentStatus(document.status);
        const color = documentColor(document.type);
        return <button type="button" key={document.id} aria-pressed={selectedId === document.id}
          className="verification-document-row" disabled={disabled} onClick={() => onSelect(document)}>
          <span className="verification-document-icon" style={{ color, background: color + '15' }}>
            {documentIcon(document.type) || <FileText size={20} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-slate-800">{documentLabel(document)}</span>
            <span className="block truncate text-xs text-slate-500">{document.fileName || 'Uploaded file'}</span>
          </span>
          <span className="badge" style={{ color: status.color, background: status.bg }}>{status.icon}{status.label}</span>
        </button>;
      })}
    </WorkspaceScrollArea>
  </section>;
}
