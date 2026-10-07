import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Building2, Briefcase, User,
  Mail, Clock, Shield, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react';
import { invitesApi, type InviteData } from '../../../lib/api';
import type { Screen } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface InviteLandingProps {
  onNavigate: (s: Screen) => void;
  inviteToken?: string;
}

export default function InviteLanding({ onNavigate, inviteToken }: InviteLandingProps) {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'accepted' | 'declined'>('idle');
  const { setSession } = useAuth();

  // Use provided token or demo token
  const token = inviteToken ?? 'demo-token';

  useEffect(() => {
    const fetchInvite = async () => {
      setLoading(true);
      try {
        const res = await invitesApi.getByToken(token);
        setInvite(res.data.data);
        if (res.data.data.status !== 'PENDING') {
          setStatus(res.data.data.status === 'ACCEPTED' ? 'accepted' : 'declined');
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { message?: string } } };
        if (e.response?.status === 404) {
          setError('Invitation not found. The link may be invalid.');
        } else if (e.response?.status === 410) {
          setError('This invitation has expired.');
        } else {
          // Demo mode: show mock invite if API not reachable
          setInvite({
            id: 'demo',
            token,
            email: 'sahan@email.com',
            name: 'Sahan Dissanayake',
            role: 'CANDIDATE',
            employmentType: 'FULL_TIME',
            designation: 'Backend Engineer',
            team: 'Engineering',
            joinedDate: '2025-08-01T00:00:00.000Z',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            invitedBy: { id: '1', name: 'Asel Perera', email: 'admin@readyhr.com' },
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setActionLoading(true);
    setError('');
    try {
      // Automatically assign 123456 as per user request
      const res = await invitesApi.accept(token, '123456');
      
      const { user, token: jwtToken } = res.data.data as any;
      if (user && jwtToken) {
        setSession(user, jwtToken);
      }

      setStatus('accepted');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to accept invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await invitesApi.decline(token);
      setStatus('declined');
    } catch {
      setStatus('declined'); // optimistic
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: '#2563eb' }} />
          <p className="text-sm text-slate-400">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
        <div className="card anim-scale-in text-center" style={{ maxWidth: 440, padding: '2.5rem' }}>
          <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0f172a' }}>Invitation Error</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Declined ──────────────────────────────────────────────────────────────
  if (status === 'declined') {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
        <div className="card anim-scale-in text-center" style={{ maxWidth: 440, padding: '3rem 2.5rem' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#fee2e2' }}>
            <XCircle size={32} style={{ color: '#dc2626' }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: '#0f172a' }}>Invitation Declined</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You've declined the invitation. If this was a mistake, please contact HR.
          </p>
        </div>
      </div>
    );
  }

  // ── Accepted ──────────────────────────────────────────────────────────────
  if (status === 'accepted') {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
        <div className="card anim-scale-in text-center" style={{ maxWidth: 480, padding: '3rem 2.5rem' }}>
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full anim-celebrate"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', opacity: 0.12 }} />
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              <CheckCircle2 size={44} color="white" />
            </div>
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: '#0f172a' }}>Welcome Aboard!</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Your account has been created successfully. You can now access the candidate portal to upload your documents and complete onboarding.
          </p>
          <button
            onClick={() => onNavigate('onboarding')}
            className="w-full h-11 rounded-lg font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'var(--sapphire)', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
          >
            Go to Onboarding Portal <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Main Card ─────────────────────────────────────────────────────────────
  return (
    <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
      <div style={{ maxWidth: 520, width: '100%' }}>

        <div className="text-center mb-8 anim-fade-up">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', boxShadow: '0 8px 32px rgba(37,99,235,0.3)' }}>
            <Building2 size={28} color="white" />
          </div>
          <h2 className="text-xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Peoples Management</h2>
          <p className="text-sm text-slate-400 mt-1">You've been invited to join the team</p>
        </div>

        <div className="card anim-fade-up delay-100" style={{ padding: '2.5rem' }}>
          <p className="text-sm text-slate-500 mb-2">
            Hey <strong className="text-slate-700">{invite?.name}</strong>,
          </p>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            <strong className="text-slate-800">{invite?.invitedBy?.name}</strong> has invited you to join{' '}
            <strong className="text-slate-800">Peoples Management</strong>.
          </p>

          <div className="rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4" style={{ background: '#f8faff', border: '1px solid #e2e8f0' }}>
            {[
              { icon: <Briefcase size={14} />, label: 'Role', value: invite?.designation },
              { icon: <Building2 size={14} />, label: 'Team', value: invite?.team },
              { icon: <Shield size={14} />, label: 'Access Level', value: invite?.role === 'ADMIN' ? 'Admin' : 'Employee' },
              { icon: <Clock size={14} />, label: 'Start Date', value: invite?.joinedDate ? new Date(invite.joinedDate).toLocaleDateString() : '—' },
              { icon: <User size={14} />, label: 'Employment', value: invite?.employmentType?.replace('_', '-') },
              { icon: <Mail size={14} />, label: 'Invited by', value: invite?.invitedBy?.name },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <div className="mt-0.5 text-slate-400">{item.icon}</div>
                <div>
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{item.value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl mb-6" style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
            <Clock size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              After accepting, you'll complete a quick onboarding setup before accessing your dashboard.
              This invitation expires on <strong>{invite?.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : '—'}</strong>.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}



          {/* Accept / Decline */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDecline}
              disabled={actionLoading}
              className="flex-1 h-11 rounded-lg font-semibold transition-all hover:bg-slate-50 active:scale-[0.98] border border-slate-200"
              style={{ color: '#64748b' }}
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="flex-1 h-11 rounded-lg font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'var(--sapphire)', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Accept Invitation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
