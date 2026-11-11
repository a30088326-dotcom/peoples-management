import { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Clock, User, Loader2, ChevronDown, LogIn } from 'lucide-react';
import { documentsApi, usersApi } from '../../../lib/api';
import VerificationDocumentList from '../components/verification/VerificationDocumentList';
import VerificationPreview from '../components/verification/VerificationPreview';
import VerificationRejectDialog from '../components/verification/VerificationRejectDialog';
import { useDocumentReview } from '../hooks/useDocumentReview';
import '../components/verification/verification-workspace.css';
import type { Screen } from '../../../types';
import type { VerificationDocument } from '../components/verification/documentPresentation';

interface VerificationProps {
  onNavigate: (s: Screen) => void;
}

// ── Candidate Info Strip ──────────────────────────────────────────────────────
function CandidateStrip({ candidate, pendingCount, onNavigate }: { candidate: any, pendingCount: number, onNavigate: (s: Screen) => void }) {
  const initials = candidate.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="verification-candidate">
      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', fontSize: 18 }}>
        {initials}
      </div>
      <div className="flex-1">
        <p className="font-bold text-slate-800">{candidate.name}</p>
        <p className="text-xs text-slate-400">
          {candidate.receivedInvite?.designation || 'Employee'} · {candidate.receivedInvite?.team || 'Company'}
        </p>
      </div>
      {pendingCount > 0 ? (
        <span className="badge badge-pending flex items-center gap-1">
          <Clock size={10} /> {pendingCount} Pending Verification
        </span>
      ) : candidate.contract?.status !== 'SIGNED' ? (
        <span className="badge badge-active flex items-center gap-1 bg-blue-100 text-blue-700">
          <Clock size={10} /> Awaiting Contract
        </span>
      ) : (
        <div className="flex items-center gap-4">
          <span className="badge badge-active flex items-center gap-1 bg-green-100 text-green-700">
            <CheckCircle2 size={10} /> All Verified & Signed
          </span>
          <button 
            onClick={() => {
              if (confirm('Navigate to Employee Information module to manually create this employee?')) {
                onNavigate('employee-information');
              }
            }}
            className="btn-primary gap-2 bg-purple-600 hover:bg-purple-700 text-xs px-3 py-1.5 h-auto rounded shadow-sm border-purple-600"
          >
            <LogIn size={14} /> Transfer to EIMS
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Verification({ onNavigate }: VerificationProps) {

  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  
  const [documentList, setDocumentList] = useState<{ candidateId: string; items: VerificationDocument[] } | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const loadingDocuments = Boolean(selectedCandidateId && documentList?.candidateId !== selectedCandidateId);
  const docs = documentList?.candidateId === selectedCandidateId ? documentList.items : [];
  const selectedDoc = docs.find(item => item.id === selectedDocumentId) ?? docs[0] ?? null;
  const review = useDocumentReview({
    document: selectedDoc, candidateId: selectedCandidateId,
    onUpdated: updated => setDocumentList(current => current?.candidateId === selectedCandidateId
      ? { ...current, items: current.items.map(item => item.id === updated.id ? updated : item) }
      : current),
    onRefreshed: items => setDocumentList({ candidateId: selectedCandidateId, items }),
  });

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  // 1. Fetch Candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const all=[];
        let page=1,totalPages=1;
        do {
          const res=await usersApi.list({page,limit:100});
          all.push(...res.data.data);
          totalPages=res.data.meta?.totalPages||1;
          page++;
        }while(page<=totalPages);
        // Activation must not hide documents that HR still needs to verify.
        const cands=all.filter(person=>person.role==='CANDIDATE'||person.documents?.length);
        setCandidates(cands);
        setSelectedCandidateId(cands[0]?.id ?? '');
      } catch (err) {
        console.error('Failed to fetch candidates', err);
      } finally {
        setLoadingCandidates(false);
      }
    };
    fetchCandidates();
  }, []);

  // 2. Fetch Documents when candidate changes
  useEffect(() => {
    if (!selectedCandidateId) return;
    let active = true;
    const fetchDocs = async () => {
      try {
        const res = await documentsApi.list(selectedCandidateId);
        const items = Array.isArray(res.data.data) ? res.data.data : [];
        if (active) setDocumentList({ candidateId: selectedCandidateId, items });
      } catch (err) {
        if (!active) return;
        console.error('Failed to fetch documents', err);
        setDocumentList({ candidateId: selectedCandidateId, items: [] });
      }
    };
    void fetchDocs();
    return () => { active = false; };
  }, [selectedCandidateId]);

  const approvedCount = docs.filter(d => d.status === 'APPROVED').length;
  const pendingCount = docs.filter(d => d.status === 'PENDING').length;
  const progress = docs.length > 0 ? Math.round((approvedCount / docs.length) * 100) : 0;
  const allVerified = docs.length > 0 && pendingCount === 0 && docs.every(d => d.status === 'APPROVED');

  const approveAll = () => {
    if (!selectedCandidate || pendingCount === 0 || review.busy || review.refreshRequired) return;
    const description = pendingCount === 1 ? '1 pending document' : `all ${pendingCount} pending documents`;
    if (window.confirm(`Approve ${description} for ${selectedCandidate.name}?`)) {
      void review.approveAll(docs);
    }
  };

  if (loadingCandidates && candidates.length === 0) {
    return (
      <div className="workspace-frame ambient-bg items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="workspace-frame ambient-bg verification-workspace">
      <div className="workspace-frame verification-content">

        {/* Header */}
        <div className="verification-toolbar">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
              Document Verification
            </h1>
            <p className="text-sm text-slate-400">Review and approve candidate documents</p>
          </div>
          <div className="flex items-center gap-6">
            
            {/* Candidate Selector */}
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select 
                className="input-field pl-9 pr-10 appearance-none bg-white font-medium text-sm"
                aria-label="Select candidate"
                value={selectedCandidateId}
                disabled={review.busy}
                onChange={event => {
                  review.reset();
                  setDocumentList(null);
                  setSelectedDocumentId('');
                  setSelectedCandidateId(event.target.value);
                }}
                style={{ width: 220, padding: '0.6rem 1rem 0.6rem 2.2rem' }}
              >
                <option value="" disabled>Select Candidate...</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="verification-progress flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <p className="text-xs text-slate-400">Progress</p>
                <p className="font-bold text-slate-700">{approvedCount}/{docs.length} Approved</p>
              </div>
              <div className="w-10 h-10 relative">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke="#2563eb" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {selectedCandidate && (
          <CandidateStrip candidate={selectedCandidate} pendingCount={pendingCount} onNavigate={onNavigate} />
        )}

        {review.error && !review.rejectOpen && <div role="alert" className="verification-review-message border-red-200 bg-red-50 text-red-700">
          <span>{review.error}</span><button type="button" className="btn-secondary" onClick={() => void review.refresh()} disabled={review.busy}>Refresh documents</button>
        </div>}
        {review.notice && <p role="status" className="verification-review-message border-emerald-200 bg-emerald-50 text-emerald-700">{review.notice}</p>}

        {loadingDocuments ? (
          <div className="workspace-frame items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : docs.length === 0 ? (
          <div className="workspace-scroll rounded-xl border border-slate-200 bg-white p-8 text-center">
            <FileText size={40} className="mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No Documents Found</h3>
            <p className="text-sm text-slate-400">This candidate has not uploaded any documents yet.</p>
          </div>
        ) : (
          <div className="verification-split">
            <VerificationDocumentList documents={docs} selectedId={selectedDoc?.id} candidateId={selectedCandidateId}
              disabled={review.busy} pendingCount={pendingCount} approvingAll={review.approvingAll}
              refreshRequired={review.refreshRequired} onApproveAll={approveAll}
              onSelect={document => {
                if (!review.refreshRequired) review.reset();
                setSelectedDocumentId(document.id);
              }} />
            {selectedDoc && <VerificationPreview document={selectedDoc} busy={review.busy} refreshRequired={review.refreshRequired}
              onApprove={() => void review.approve()} onReject={review.openReject} onSendLink={() => void review.sendReuploadLink()} />}
          </div>
        )}

        {allVerified && <div className="verification-contract-link">
          <div><p className="font-semibold text-emerald-900">All documents approved</p><p className="text-emerald-700">Continue with the employment contract when ready.</p></div>
          <button type="button" className="btn-primary" onClick={() => onNavigate('contract')}>Proceed to Contract</button>
        </div>}

      </div>

      {review.rejectOpen && <VerificationRejectDialog note={review.rejectionNote} onNoteChange={review.setRejectionNote}
        busy={review.busy} error={review.error} refreshRequired={review.refreshRequired}
        onCancel={review.closeReject} onConfirm={() => void review.reject()} onRefresh={() => void review.refresh()} />}
    </div>
  );
}
