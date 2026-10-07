import { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, XCircle, Clock, Eye, Download,
  AlertTriangle, User, Landmark, Image, Briefcase, ChevronRight,
  ZoomIn, Loader2, ChevronDown, Send, LogIn
} from 'lucide-react';
import { documentsApi, usersApi } from '../../../lib/api';
import { eimsApi } from '../../../lib/api/employee_information_audit';
import type { Screen } from '../../../types';

interface VerificationProps {
  onNavigate: (s: Screen) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Pending Review', color: '#a16207', bg: '#fef9c3', icon: <Clock size={12} /> },
  APPROVED: { label: 'Approved',       color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={12} /> },
  REJECTED: { label: 'Rejected',       color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={12} /> },
};

const DOC_ICONS: Record<string, React.ReactNode> = {
  'NATIONAL_ID': <FileText size={20} />,
  'BANK_STATEMENT': <Landmark size={20} />,
  'PASSPORT_PHOTO': <Image size={20} />,
  'EMPLOYMENT_DOCS': <Briefcase size={20} />,
  'PREVIOUS_SERVICE': <Briefcase size={20} />,
  'OTHER': <FileText size={20} />,
};

const DOC_LABELS: Record<string, string> = {
  'NATIONAL_ID': 'National ID',
  'BANK_STATEMENT': 'Bank Statement',
  'PASSPORT_PHOTO': 'Passport Photo',
  'EMPLOYMENT_DOCS': 'Employment Documents',
  'PREVIOUS_SERVICE': 'Previous Service',
  'OTHER': 'Other Document',
};

const DOC_COLORS: Record<string, string> = {
  'NATIONAL_ID': '#2563eb',
  'BANK_STATEMENT': '#7c3aed',
  'PASSPORT_PHOTO': '#0891b2',
  'EMPLOYMENT_DOCS': '#059669',
  'PREVIOUS_SERVICE': '#0e7490',
  'OTHER': '#475569',
};

const getReadableDocLabel = (doc: any) => {
  if (!doc) return 'Uploaded Document';
  return doc.label || DOC_LABELS[doc.type] || doc.fileName || 'Uploaded Document';
};

// ── Candidate Info Strip ──────────────────────────────────────────────────────
function CandidateStrip({ candidate, pendingCount, onNavigate }: { candidate: any, pendingCount: number, onNavigate: (s: Screen) => void }) {
  const initials = candidate.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-4 anim-fade-up">
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
  
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  // 1. Fetch Candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await usersApi.list({ role: 'CANDIDATE' });
        const cands = res.data.data;
        setCandidates(cands);
        setSelectedCandidateId(cands[0]?.id ?? '');
        if (cands.length === 0) {
          setDocs([]);
          setSelectedDoc(null);
        }
      } catch (err) {
        console.error('Failed to fetch candidates', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  // 2. Fetch Documents when candidate changes
  useEffect(() => {
    if (!selectedCandidateId) return;
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const res = await documentsApi.list(selectedCandidateId);
        const docsToUse = Array.isArray(res.data.data) ? res.data.data : [];
        setDocs(docsToUse);

        if (docsToUse.length > 0) {
          setSelectedDoc(docsToUse[0]);
        } else {
          setSelectedDoc(null);
        }
      } catch (err) {
        console.error('Failed to fetch documents', err);
        setDocs([]);
        setSelectedDoc(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [selectedCandidateId, selectedCandidate]);

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await documentsApi.verify(id, status, status === 'REJECTED' ? rejectionNote : undefined);
      const updatedDoc = res.data.data;
      
      setDocs(p => p.map(d => d.id === id ? updatedDoc : d));
      setSelectedDoc(updatedDoc);
      
      if (status === 'REJECTED') {
        setShowRejectModal(false);
        setRejectionNote('');
      }
    } catch (err: any) {
      console.error('Failed to update document', err);
      if (err.response?.status === 404) {
        alert('This document version no longer exists. The candidate has likely uploaded a new version. The page will now refresh.');
        window.location.reload();
      } else {
        alert('Failed to update document status');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = () => selectedDoc && updateStatus(selectedDoc.id, 'APPROVED');
  const handleReject = () => selectedDoc && updateStatus(selectedDoc.id, 'REJECTED');

  const handleSendLink = async () => {
    if (!selectedDoc) return;
    setSendingLink(true);
    try {
      await documentsApi.sendReuploadLink(selectedDoc.id);
      alert('Upload link sent successfully to the candidate!');
    } catch (error) {
      alert('Failed to send upload link.');
    } finally {
      setSendingLink(false);
    }
  };

  const approvedCount = docs.filter(d => d.status === 'APPROVED').length;
  const pendingCount = docs.filter(d => d.status === 'PENDING').length;
  const progress = docs.length > 0 ? Math.round((approvedCount / docs.length) * 100) : 0;
  const allVerified = docs.length > 0 && pendingCount === 0 && docs.every(d => d.status === 'APPROVED');

  if (loading && candidates.length === 0) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="ambient-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 anim-fade-up">
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
                value={selectedCandidateId}
                onChange={e => setSelectedCandidateId(e.target.value)}
                style={{ width: 220, padding: '0.6rem 1rem 0.6rem 2.2rem' }}
              >
                <option value="" disabled>Select Candidate...</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <p className="text-xs text-slate-400">Progress</p>
                <p className="font-bold text-slate-700">{approvedCount}/{docs.length} Approved</p>
              </div>
              <div className="w-14 h-14 relative">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
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

        {loading && candidates.length > 0 ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : docs.length === 0 ? (
          <div className="card text-center py-20">
            <FileText size={40} className="mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No Documents Found</h3>
            <p className="text-sm text-slate-400">This candidate has not uploaded any documents yet.</p>
          </div>
        ) : (
          /* Split Screen */
          <div className="grid grid-cols-5 gap-5">

            {/* Left: Document List */}
            <div className="col-span-2">
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="font-bold text-sm text-slate-700">Submitted Documents</p>
                </div>
                {docs.map((doc) => {
                  const cfg = STATUS_CONFIG[doc.status];
                  const isSelected = selectedDoc?.id === doc.id;
                  const docColor = DOC_COLORS[doc.type] || '#475569';
                  
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="p-4 flex items-center gap-3 cursor-pointer transition-all border-b border-slate-50"
                      style={{
                        background: isSelected ? 'rgba(37,99,235,0.04)' : 'white',
                        borderLeft: isSelected ? `3px solid #2563eb` : '3px solid transparent',
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${docColor}15`, color: docColor }}>
                        {DOC_ICONS[doc.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{getReadableDocLabel(doc)}</p>
                        <p className="text-xs text-slate-400 truncate">{doc.fileName || 'Uploaded file'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Preview Panel */}
            <div className="col-span-3">
              {selectedDoc && (
                <div className="card anim-slide-r" style={{ padding: 0, overflow: 'hidden' }}>
                  
                  {/* Preview Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${DOC_COLORS[selectedDoc.type]}15`, color: DOC_COLORS[selectedDoc.type] }}>
                        {DOC_ICONS[selectedDoc.type]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{getReadableDocLabel(selectedDoc)}</p>
                        <p className="text-xs text-slate-400">{selectedDoc.fileName || 'Uploaded file'} · {selectedDoc.fileSize || 'Pending review'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={selectedDoc.fileUrl} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-slate-100 transition-colors tooltip text-slate-500" title="View Full">
                        <ZoomIn size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="p-6">
                    <div className="rounded-2xl overflow-hidden mb-5 bg-slate-50 border border-slate-200 flex items-center justify-center relative group" style={{ minHeight: 380 }}>
                      {selectedDoc.fileType?.includes('PDF') ? (
                        <iframe src={selectedDoc.fileUrl} className="w-full h-full absolute inset-0" title={selectedDoc.label} />
                      ) : (
                        <a href={selectedDoc.fileUrl} target="_blank" rel="noreferrer" className="w-full h-full absolute inset-0 block cursor-zoom-in">
                          <img src={selectedDoc.fileUrl} alt={selectedDoc.label} className="max-w-full max-h-full object-contain absolute inset-0 m-auto" style={{ maxHeight: 380 }} />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                            <ZoomIn size={40} className="text-white mb-2 shadow-lg" />
                            <p className="text-white font-medium text-sm shadow-sm">Click to View Full Screen</p>
                          </div>
                        </a>
                      )}
                    </div>

                    {/* Status Note */}
                    {selectedDoc.status === 'REJECTED' && (
                      <div className="flex items-start gap-3 p-4 rounded-xl mb-5"
                        style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                        <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-700">Document Rejected</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Reason: {selectedDoc.rejectionNote || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedDoc.status === 'APPROVED' && (
                      <div className="flex items-start gap-3 p-4 rounded-xl mb-5"
                        style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
                        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-700">Document Verified & Approved</p>
                          <p className="text-xs text-green-600 mt-0.5">Verified on {selectedDoc.verifiedAt ? new Date(selectedDoc.verifiedAt).toLocaleDateString() : ''}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {selectedDoc.status === 'PENDING' && (
                      <div className="flex gap-3">
                        <button
                          className="btn-danger flex-1 flex items-center justify-center gap-2"
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionLoading}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                        <button
                          className="btn-primary flex-1 flex items-center justify-center gap-2"
                          onClick={handleApprove}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Approve Document
                        </button>
                      </div>
                    )}
                    {selectedDoc.status !== 'PENDING' && (
                      <div className="flex gap-3">
                        {selectedDoc.status === 'APPROVED' && (
                          <button
                            className="btn-danger flex-1"
                            onClick={() => setShowRejectModal(true)}
                            disabled={actionLoading}
                          >
                            <XCircle size={14} /> Reject Instead
                          </button>
                        )}
                        {selectedDoc.status === 'REJECTED' && (
                          <div className="flex flex-col flex-1 gap-2">
                            <button
                              className="btn-primary flex items-center justify-center gap-2 w-full"
                              onClick={handleApprove}
                              disabled={actionLoading}
                            >
                              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve Instead
                            </button>
                            <button
                              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                              onClick={handleSendLink}
                              disabled={sendingLink}
                            >
                              {sendingLink ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Re-upload Link
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proceed to Contract */}
        {allVerified && (
          <div
            className="mt-6 glass rounded-2xl p-5 flex items-center justify-between anim-fade-up delay-200 cursor-pointer card-hover"
            onClick={() => onNavigate('contract')}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#059669,#0891b2)' }}>
                <FileText size={18} color="white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Proceed to Contract & E-Signature</p>
                <p className="text-xs text-slate-400 mt-0.5">Issue the employment contract for {selectedCandidate?.name}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </div>
        )}

      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div
            className="card anim-scale-in"
            style={{ maxWidth: 420, width: '100%', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#fee2e2' }}>
              <XCircle size={24} style={{ color: '#dc2626' }} />
            </div>
            <h3 className="text-lg font-bold text-center mb-1" style={{ color: '#0f172a' }}>Reject Document</h3>
            <p className="text-xs text-slate-400 text-center mb-4">Provide a reason so the candidate knows what to resubmit.</p>
            <label className="input-label">Rejection Reason</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Document is blurry, expiry date missing..."
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              style={{ resize: 'none' }}
            />
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn-danger flex-1 flex justify-center items-center gap-2" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null} Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
