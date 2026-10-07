import { useState } from 'react';
import {
  X, AlertTriangle, Shield, User, Mail, Briefcase,
  Building2, Calendar, ChevronDown, CheckCircle2, Send, Loader2,
} from 'lucide-react';
import { invitesApi } from '../../../lib/api';
import { eimApi } from '../../../lib/api/eimApi';
import { useEffect } from 'react';
import type { Screen } from '../../../types';

const TEAMS = ['Engineering', 'Design', 'Product', 'Marketing', 'Finance', 'People Ops', 'Sales', 'Operations'];
const DESIGNATIONS = ['Software Engineer', 'Senior Engineer', 'Product Designer', 'Product Manager', 'HR Manager', 'Finance Manager', 'Marketing Lead', 'Data Analyst', 'QA Engineer', 'DevOps Engineer'];

interface InviteFormProps {
  onNavigate: (s: Screen) => void;
  onInviteSent: () => void;
}

type RoleType = 'ADMIN' | 'CANDIDATE';
type EmpType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

const EMP_LABELS: Record<EmpType, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERN: 'Intern',
};

const normalizeEmploymentTypeValue = (value: string): string => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized.includes('full')) return 'FULL_TIME';
  if (normalized.includes('part') || normalized.includes('casual') || normalized.includes('call')) return 'PART_TIME';
  if (normalized.includes('intern')) return 'INTERN';
  if (normalized.includes('contract')) return 'CONTRACT';
  
  // Safe fallback if totally unrecognized
  return 'CONTRACT';
};

interface FormData {
  name: string; email: string; role: RoleType;
  employmentType: string; designation: string; team: string; joinedDate: string;
}

const EMPTY: FormData = {
  name: '', email: '', role: 'CANDIDATE',
  employmentType: '', designation: '', team: '', joinedDate: '',
};

export default function InviteForm({ onNavigate, onInviteSent }: InviteFormProps) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [result, setResult] = useState<{ name: string; email: string; link: string; sent: boolean; reason?: string } | null>(null);
  const [eimData, setEimData] = useState({
    designations: [] as any[],
    departments: [] as any[],
    employmentTypes: [] as any[],
  });

  useEffect(() => {
    let isMounted = true;

    const fetchEimMetadata = async () => {
      try {
        const [designationsRes, structuresRes, employmentTypesRes] = await Promise.all([
          eimApi.getDesignations(),
          eimApi.getStructures(),
          eimApi.getEmploymentTypes(),
        ]);

        if (!isMounted) return;

        setEimData({
          designations: designationsRes.data?.data || [],
          departments: (structuresRes.data?.data || []).filter((item: any) => item.structureType === 'Department'),
          employmentTypes: employmentTypesRes.data?.data || [],
        });
      } catch (err) {
        console.error('Failed to load invite metadata', err);
      }
    };

    fetchEimMetadata();
    return () => { isMounted = false; };
  }, []);

  const set = (k: keyof FormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
    setApiError('');
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.employmentType) e.employmentType = 'Required';
    if (!form.designation) e.designation = 'Required';
    if (!form.team) e.team = 'Required';
    if (!form.joinedDate) e.joinedDate = 'Required';
    if (form.role === 'ADMIN' && !adminConfirmed) { setShowAdminWarning(true); return false; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await invitesApi.create({
        name: form.name,
        email: form.email,
        role: form.role,
        employmentType: normalizeEmploymentTypeValue(form.employmentType) as any,
        designation: form.designation,
        team: form.team,
        joinedDate: new Date(form.joinedDate).toISOString(),
      });
      setResult({
        name: form.name,
        email: form.email,
        link: res.data.data.inviteLink,
        sent: res.data.data.delivery?.sent === true,
        reason: res.data.data.delivery?.reason,
      });
      onInviteSent();
    } catch (e: any) {
      console.error('Invite Error:', e, e.response?.data);
      const backendMsg = e.response?.data?.message;
      setApiError(backendMsg || e.message || 'Failed to send invite. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" style={{ transform: 'translate(-50%, -50%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" style={{ transform: 'translate(50%, 50%)' }} />

        <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] anim-scale-in text-center relative z-10 border border-slate-100" style={{ maxWidth: 540, width: '100%', padding: '4rem 3rem' }}>
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#2563eb' }} />
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl mx-auto"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              <CheckCircle2 size={56} color="white" />
            </div>
          </div>
          
          <h2 className="text-4xl font-black mb-4 text-slate-800" style={{ letterSpacing: '-0.04em' }}>
            {result.sent ? 'Invitation Email Sent' : 'Invitation Created'}
          </h2>
          
          <p className="text-slate-600 text-base mb-2">
            {result.sent
              ? 'The mail server accepted the onboarding invitation for'
              : 'The invitation was saved, but no email was delivered to'}
          </p>
          
          <div className="inline-flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8 w-full max-w-sm mx-auto">
            <span className="font-bold text-slate-800 text-lg mb-1">{result.name}</span>
            <span className="text-slate-500 text-sm flex items-center justify-center gap-1.5">
              <Mail size={14} /> {result.email}
            </span>
          </div>

          {!result.sent && (
            <div className="text-left rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-5">
              <p className="text-sm font-semibold text-amber-900">Email delivery needs attention</p>
              <p className="text-xs text-amber-800 mt-1">{result.reason || 'Check the SMTP mail settings before resending.'}</p>
            </div>
          )}

          <div className="flex justify-center">
            <button className="btn-primary w-full max-w-xs py-3 text-base" onClick={() => onNavigate('dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="ambient-bg min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <div className="flex items-center gap-3 mb-6 anim-fade-up">
          <button onClick={() => onNavigate('dashboard')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Invite Team Member</h1>
            <p className="text-xs text-slate-400">Fill in the details to send a secure invitation</p>
          </div>
        </div>

        <div className="card anim-fade-up delay-100">

          {/* API Error */}
          {apiError && (
            <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
              style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          {/* Role Selector */}
          <div className="mb-6 hidden">
            <label className="input-label">Role</label>
            <div className="grid grid-cols-1 gap-3">
              {(['CANDIDATE'] as RoleType[]).map(r => (
                <button key={r}
                  onClick={() => { set('role', r); if (r === 'ADMIN' && !adminConfirmed) setShowAdminWarning(true); }}
                  className="relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left"
                  style={{ borderColor: form.role === r ? '#2563eb' : '#e2e8f0', background: form.role === r ? 'rgba(37,99,235,0.04)' : 'white' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: form.role === r ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : '#f1f5f9' }}>
                    {r === 'ADMIN' ? <Shield size={16} color={form.role === r ? 'white' : '#94a3b8'} /> : <User size={16} color={form.role === r ? 'white' : '#94a3b8'} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: form.role === r ? '#1d4ed8' : '#0f172a' }}>
                      {r === 'ADMIN' ? 'Admin' : 'Employee'}
                    </p>
                    <p className="text-xs text-slate-400">{r === 'ADMIN' ? 'Full platform access' : 'Standard member access'}</p>
                  </div>
                  {form.role === r && <CheckCircle2 size={16} className="absolute top-3 right-3" style={{ color: '#2563eb' }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="input-label">Full Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <input className="input-field"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="input-label">Email <span className="text-red-400">*</span></label>
              <div className="relative">
                <input className="input-field" type="email"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="input-label">Designation <span className="text-red-400">*</span></label>
              <div className="relative">
                <select className="input-field appearance-none" value={form.designation} onChange={e => set('designation', e.target.value)}>
                  <option value="" disabled>Select a role...</option>
                  {eimData.designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
            </div>
            <div>
              <label className="input-label">Team <span className="text-red-400">*</span></label>
              <div className="relative">
                <select className="input-field appearance-none" value={form.team} onChange={e => set('team', e.target.value)}>
                  <option value="" disabled>Select department...</option>
                  {eimData.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {errors.team && <p className="text-xs text-red-500 mt-1">{errors.team}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="input-label">Employment Type</label>
              <div className="relative">
                <select className="input-field appearance-none" value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                  <option value="" disabled>Select type...</option>
                  {eimData.employmentTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {errors.employmentType && <p className="text-xs text-red-500 mt-1">{errors.employmentType}</p>}
            </div>
            <div>
              <label className="input-label">Joining Date <span className="text-red-400">*</span></label>
              <div className="relative">
                <input 
                  type="date" 
                  className="input-field" 
                  value={form.joinedDate} 
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('joinedDate', e.target.value)} 
                />
              </div>
              {errors.joinedDate && <p className="text-xs text-red-500 mt-1">{errors.joinedDate}</p>}
            </div>
          </div>

          <button onClick={handleSend} disabled={loading}
            className="btn-primary btn-primary-pulse w-full flex items-center justify-center gap-2"
            style={{ padding: '0.875rem', fontSize: '0.9rem' }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Invitation</>}
          </button>
          
          <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
            <Mail size={12} />
            The link is created securely; the delivery result will be shown after you submit.
          </p>
        </div>
      </div>

      {/* Admin Warning Modal */}
      {showAdminWarning && (
        <div className="modal-overlay" onClick={() => setShowAdminWarning(false)}>
          <div className="card anim-scale-in" style={{ maxWidth: 420, width: '100%', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
              <AlertTriangle size={28} style={{ color: '#d97706' }} />
            </div>
            <h3 className="text-lg font-black text-center mb-2" style={{ color: '#0f172a' }}>Grant Admin Access?</h3>
            <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
              Admins have <strong className="text-slate-700">full access</strong> to all company data, employee records, and system configurations.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => { setShowAdminWarning(false); set('role', 'CANDIDATE'); }}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => { setAdminConfirmed(true); setShowAdminWarning(false); }}
                style={{ background: 'linear-gradient(135deg,#d97706,#dc2626)' }}>
                Yes, Grant Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
