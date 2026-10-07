import { useState, useRef, useEffect } from 'react';
import {
  FileText, Edit3, Trash2, Plus, CheckCircle2, Download,
  RefreshCw, PenTool, Send, Eye, Loader2, User, ChevronDown,
  AlertCircle, Clock, Copy
} from 'lucide-react';
import { contractsApi, usersApi, type ContractData, type MemberData } from '../../../lib/api';
import type { Screen } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface ContractSignProps {
  onNavigate: (s: Screen) => void;
}

const DEFAULT_TEMPLATE = `EMPLOYMENT AGREEMENT

This Employment Agreement is made and entered into on {{Date}} by and between:

Company: Peoples Management HR Platform
Employee: {{Candidate Name}}

1. POSITION AND DUTIES
The Employer agrees to employ the Employee as {{Designation}} in the {{Team}} department. The Employee will begin employment on {{Start Date}}.

2. COMPENSATION
The Employee will be paid a salary of {{Salary}} {{Currency}} per month, subject to applicable deductions and taxes.

3. WORKING HOURS
The standard working hours will be 40 hours per week.

4. CONFIDENTIALITY
The Employee agrees to keep confidential all proprietary information and trade secrets of the Company.

IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.`;

const TOKENS = ['Candidate Name', 'Designation', 'Team', 'Salary', 'Currency', 'Start Date', 'Date'];

type ViewMode = 'admin-builder' | 'candidate-sign';

export default function ContractSign({ onNavigate }: ContractSignProps) {
  const { user, isAdmin, token, setSession } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>(isAdmin ? 'admin-builder' : 'candidate-sign');
  
  // Data
  const [candidates, setCandidates] = useState<MemberData[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [activeContract, setActiveContract] = useState<ContractData | null>(null);

  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [contractValues, setContractValues] = useState<Record<string, string>>({
    'Candidate Name': '',
    'Designation': '',
    'Team': '',
    'Salary': 'LKR 250,000',
    'Currency': 'LKR',
    'Start Date': '',
    'Date': new Date().toLocaleDateString(),
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [justSigned, setJustSigned] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const isSubmitting = useRef(false);
  const [copyOk, setCopyOk] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const contractLocked = activeContract?.status === 'SIGNED' || activeContract?.status === 'CANCELLED';

  // 1. Fetch Candidates (if admin) or set current user (if candidate)
  useEffect(() => {
    if (!isAdmin) {
      if (user?.id) setSelectedCandidateId(user.id);
      setLoading(false);
      return;
    }
    const fetchCandidates = async () => {
      try {
        const res = await usersApi.list({ role: 'CANDIDATE' });
        const cands = res.data.data;
        setCandidates(cands);
        if (cands.length > 0) {
          setSelectedCandidateId(cands[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch candidates', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [isAdmin, user]);

  // 2. Load Candidate Contract / Update Values
  useEffect(() => {
    if (!selectedCandidateId) return;
    const cand = candidates.find(c => c.id === selectedCandidateId);
    if (cand) {
      setContractValues(p => ({
        ...p,
        'Candidate Name': cand.name,
        'Designation': cand.receivedInvite?.designation || '',
        'Team': cand.receivedInvite?.team || '',
        'Start Date': cand.receivedInvite?.joinedDate ? new Date(cand.receivedInvite.joinedDate).toLocaleDateString() : '',
      }));
    } else if (!isAdmin && user) {
      setContractValues(p => ({
        ...p,
        'Candidate Name': user.name || '',
      }));
    }

    const fetchContract = async () => {
      setLoading(true);
      try {
        const res = await contractsApi.list();
        const candContracts = res.data.data.filter(c => c.candidateId === selectedCandidateId);
        if (candContracts.length > 0) {
          // Get most recent
          const latest = candContracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          setActiveContract(latest);
          setTemplate(latest.templateContent);
          setContractValues(latest.fieldValues);
          setJustSigned(false);
        } else {
          setActiveContract(null);
          setJustSigned(false);
        }
      } catch (err) {
        console.error('Failed to fetch contracts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [selectedCandidateId, candidates]);

  const getRenderedContract = () => {
    if (activeContract) return activeContract.renderedContent;
    let rendered = template;
    Object.entries(contractValues).forEach(([key, val]) => {
      rendered = rendered.split(`{{${key}}}`).join(val || `[${key}]`);
    });
    return rendered;
  };

  const handleSendContract = async () => {
    if (!selectedCandidateId) return;
    setActionLoading(true);
    setApiError('');
    try {
      const res = await contractsApi.create({
        candidateId: selectedCandidateId,
        title: 'Employment Agreement',
        templateContent: template,
        fieldValues: contractValues,
      });
      setActiveContract(res.data.data);
      setViewMode('candidate-sign');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'Failed to send contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateContract = async () => {
    if (!activeContract || contractLocked) return;
    setActionLoading(true);
    setApiError('');
    try {
      const res = await contractsApi.update(activeContract.id, {
        templateContent: template,
        fieldValues: contractValues,
      });
      setActiveContract(res.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'Failed to save contract changes');
    } finally {
      setActionLoading(false);
    }
  };

  // Canvas Drawing
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeContract?.status === 'SIGNED') return;
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const pos = getPos(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    lastPos.current = pos;
    setSignatureEmpty(false);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
    setHasSigned(!signatureEmpty);
  };

  const clearSignature = () => {
    if (activeContract?.status === 'SIGNED') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureEmpty(true);
    setHasSigned(false);
  };

  const handleSign = async () => {
    if (signatureEmpty || !activeContract || isSubmitting.current) return;
    isSubmitting.current = true;
    setActionLoading(true);
    setApiError('');
    try {
      const dataUrl = canvasRef.current?.toDataURL('image/png') || '';
      await contractsApi.sign(activeContract.id, dataUrl);
      
      // Update local state to reflect signed status
      setActiveContract({ ...activeContract, status: 'SIGNED', signatureUrl: dataUrl, signedAt: new Date().toISOString() });
      setHasSigned(true);
      setJustSigned(true);
    } catch (err: any) {
      console.error('Failed to sign contract', err);
      setApiError(err.response?.data?.message || 'Failed to sign contract');
    } finally {
      setActionLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleSendLink = async () => {
    if (!activeContract) return;
    setSendingLink(true);
    try {
      await contractsApi.sendLink(activeContract.id);
      alert('Contract signing link sent successfully!');
    } catch (err) {
      console.error('Failed to send link', err);
      alert('Failed to send link');
    } finally {
      setSendingLink(false);
    }
  };

  if (loading && candidates.length === 0 && isAdmin) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin && !activeContract && !loading) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
        <div className="card anim-scale-in text-center p-12 max-w-md w-full">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Contract Yet</h2>
          <p className="text-sm text-slate-500 mb-6">Your employment agreement is currently being drafted by HR. Please check back later.</p>
          <button className="btn-secondary w-full" onClick={() => onNavigate('dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Signed Success ────────────────────────────────────────────────────────
  if (justSigned && viewMode === 'candidate-sign') {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
        <div className="card anim-scale-in text-center" style={{ maxWidth: 520, padding: '3rem 2.5rem' }}>
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full anim-celebrate"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', opacity: 0.12 }} />
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              <PenTool size={40} color="white" />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
            Contract Signed! ✍️
          </h2>
          <p className="text-slate-500 text-sm mb-2">
            {activeContract?.candidate?.name} has successfully signed the employment agreement.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Signed on {activeContract?.signedAt ? new Date(activeContract.signedAt).toLocaleString() : new Date().toLocaleString()} · Legally binding digital signature applied.
          </p>

          <div className="rounded-2xl p-4 mb-6 text-left grid grid-cols-2 gap-3"
            style={{ background: '#f8faff', border: '1px solid #e2e8f0' }}>
            {[
              { label: 'Employee', value: activeContract?.candidate?.name || 'Candidate' },
              { label: 'Role', value: activeContract?.fieldValues['Designation'] || 'Role' },
              { label: 'Start Date', value: activeContract?.fieldValues['Start Date'] || 'TBD' },
              { label: 'Contract Status', value: '✅ Executed' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={() => setJustSigned(false)}>
              View Signed Contract
            </button>
            <button className="btn-primary flex-1" onClick={() => onNavigate('dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>
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
              Contract Builder & E-Signature
            </h1>
            <p className="text-sm text-slate-400">Create and send the employment contract for digital signing</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Candidate Selector (Admin Only) */}
            {isAdmin && (
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
            )}

            {/* View Toggle (Admin Only) */}
            {isAdmin && (
              <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#f1f5f9' }}>
                {([
                  { id: 'admin-builder', label: 'Admin Builder', icon: <Edit3 size={14} /> },
                  { id: 'candidate-sign', label: 'Candidate Sign', icon: <PenTool size={14} /> },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: viewMode === tab.id ? 'white' : 'transparent',
                      color: viewMode === tab.id ? '#0f172a' : '#64748b',
                      boxShadow: viewMode === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {apiError && (
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5 mx-auto"
            style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* Admin Builder */}
        {viewMode === 'admin-builder' && (
          <div className="grid grid-cols-5 gap-5">

            {/* Left: Template Editor */}
            <div className="col-span-3">
              <div className="card anim-slide-l" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-700">Contract Template</p>
                    {activeContract && <span className="badge badge-active text-[10px]">Saved</span>}
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
                      <Download size={12} /> Export PDF
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-slate-400 mb-3">
                    Use <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{'{{Token}}'}</code> syntax for dynamic fields.
                  </p>
                  {/* Token Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {TOKENS.map(t => (
                      <button
                        key={t}
                        onClick={() => setTemplate(p => p + ` {{${t}}}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                      >
                        <Plus size={10} /> {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input-field font-mono text-xs leading-relaxed"
                    style={{ minHeight: 340, resize: 'vertical' }}
                    value={template}
                    onChange={e => setTemplate(e.target.value)}
                    disabled={contractLocked}
                    placeholder="Type your contract wording here. You may use {{Candidate Name}} or any supported token."
                    aria-label="Contract template text"
                  />
                </div>
              </div>
            </div>

            {/* Right: Values + Preview */}
            <div className="col-span-2 space-y-4">
              {/* Fill Values */}
              <div className="card anim-slide-r" style={{ padding: '1.5rem' }}>
                <p className="font-bold text-sm text-slate-700 mb-4">Fill Contract Values</p>
                <div className="space-y-3">
                  {Object.entries(contractValues).map(([key, val]) => (
                    <div key={key}>
                      <label className="input-label">{key}</label>
                      <input
                        className="input-field"
                        value={val}
                        onChange={e => setContractValues(p => ({ ...p, [key]: e.target.value }))}
                        disabled={contractLocked}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Send to Candidate */}
              {!activeContract ? (
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 btn-primary-pulse"
                  style={{ padding: '0.875rem' }}
                  onClick={handleSendContract}
                  disabled={actionLoading || !selectedCandidateId}
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send for E-Signature
                </button>
              ) : (
                <div className="space-y-2">
                  {!contractLocked && (
                    <button
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      style={{ padding: '0.875rem' }}
                      onClick={handleUpdateContract}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Save Contract Changes
                    </button>
                  )}
                  <button
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                    style={{ padding: '0.875rem' }}
                    onClick={() => setViewMode('candidate-sign')}
                  >
                    <Eye size={16} /> View Candidate Contract
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Candidate Sign View */}
        {viewMode === 'candidate-sign' && (
          <div className="grid grid-cols-5 gap-5">

            {/* Left: Contract Preview */}
            <div className="col-span-3">
              <div className="card anim-slide-l" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <p className="font-bold text-sm text-slate-700">Employment Agreement</p>
                  </div>
                  {activeContract?.status === 'SIGNED' ? (
                    <span className="badge badge-active flex items-center gap-1"><CheckCircle2 size={12}/> Signed</span>
                  ) : (
                    <span className="badge badge-pending flex items-center gap-1">Awaiting Signature</span>
                  )}
                </div>
                <div className="p-6">
                  <pre className="text-xs text-slate-600 leading-7 whitespace-pre-wrap font-sans"
                    style={{ maxHeight: 440, overflowY: 'auto' }}>
                    {getRenderedContract()}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right: Signature Panel */}
            <div className="col-span-2">
              <div className="card anim-slide-r" style={{ padding: '1.5rem' }}>
                <div className="flex items-center gap-2 mb-1">
                  <PenTool size={18} style={{ color: '#2563eb' }} />
                  <p className="font-bold text-slate-800">Digital Signature</p>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Draw your signature in the box below. This constitutes a legally binding e-signature.
                </p>

                {/* Candidate Info */}
                <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
                  style={{ background: '#f8faff', border: '1px solid #e2e8f0' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                    {contractValues['Candidate Name'] ? contractValues['Candidate Name'].split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'CD'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{contractValues['Candidate Name'] || 'Candidate'}</p>
                    <p className="text-xs text-slate-400">{contractValues['Designation'] || 'Role'}</p>
                  </div>
                </div>

                {/* Signature Canvas */}
                <div className="relative mb-4">
                  {activeContract?.signatureUrl ? (
                    <div className="w-full h-[140px] border-2 border-slate-200 rounded-xl flex items-center justify-center bg-slate-50">
                      <img src={activeContract.signatureUrl} alt="Signature" className="max-h-full" />
                    </div>
                  ) : isAdmin ? (
                    <div className="w-full h-[140px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 relative group">
                      <Clock size={24} className="text-amber-400 mb-2" />
                      <p className="text-xs font-semibold text-slate-500 mb-3">Waiting for candidate signature...</p>
                      
                      <div className="flex flex-col gap-2 w-full px-6">
                        <button 
                          onClick={handleSendLink}
                          disabled={sendingLink}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm w-full"
                        >
                          {sendingLink ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Send Link
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <canvas
                        ref={canvasRef}
                        width={480}
                        height={160}
                        className="signature-pad w-full"
                        style={{ height: 140, touchAction: 'none' }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                      />
                      {signatureEmpty && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <PenTool size={24} className="text-slate-300 mb-2" />
                          <p className="text-xs text-slate-300">Draw your signature here</p>
                        </div>
                      )}
                      <button
                        onClick={clearSignature}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
                      >
                        <RefreshCw size={12} className="text-slate-400" />
                      </button>
                    </>
                  )}
                </div>

                {/* Date */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-5">
                  <span>Signing date: {activeContract?.signedAt ? new Date(activeContract.signedAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                  <span>IP: 192.168.1.105</span>
                </div>

                {/* Checkbox */}
                {!activeContract?.signatureUrl && !isAdmin && (
                  <label className="flex items-start gap-2.5 cursor-pointer mb-5">
                    <input
                      type="checkbox"
                      checked={hasSigned}
                      onChange={e => setHasSigned(e.target.checked)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I agree to the terms of this Employment Agreement and confirm that my e-signature above is legally binding.
                    </span>
                  </label>
                )}

                {/* Submit */}
                {!activeContract?.signatureUrl && !isAdmin && (
                  <button
                    onClick={handleSign}
                    disabled={signatureEmpty || !hasSigned || actionLoading || !activeContract}
                    className="btn-primary btn-primary-pulse w-full flex items-center justify-center gap-2"
                    style={{
                      padding: '0.875rem',
                      opacity: (signatureEmpty || !hasSigned || !activeContract) && !actionLoading ? 0.5 : 1,
                      cursor: (signatureEmpty || !hasSigned || !activeContract) && !actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Securing your signature...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Sign & Submit Contract
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
