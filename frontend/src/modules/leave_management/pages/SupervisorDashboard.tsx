import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, UserX, CalendarDays, Clock, CheckCircle2,
  XCircle, AlertTriangle, TrendingUp, TrendingDown, Shield,
  Activity, RefreshCw, Loader2, ChevronRight, BarChart3,
  Zap, Eye, MessageSquare, X, Check, AlertCircle, Info,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import TeamProfileRequests from '../../self_service/components/TeamProfileRequests';
import {
  leavesApi,
  type TeamDashboardData,
  type PendingApprovalData,
} from '../../../lib/api';
import type { Screen } from '../../../types';

interface SupervisorDashboardProps {
  onNavigate: (s: Screen) => void;
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

import ApprovalModal from '../components/modals/ApprovalModal';
import {
  AvailabilityWidget,
  HeatmapWidget,
  BradfordWidget,
  PendingApprovalsWidget,
  StatCards,
} from '../components/cards/SupervisorWidgets';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SupervisorDashboard({ onNavigate }: SupervisorDashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewApp, setReviewApp] = useState<PendingApprovalData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await leavesApi.getTeamDashboard();
      setData(res.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproval = async (id: string, action: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await leavesApi.approveOrReject(id, action, reason);
      await fetchData();
    } catch {
      setActionError('Failed to process the request.');
    }
  };

  if (loading) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color: '#2563eb' }} />
          <p className="text-sm text-slate-400 font-medium">Loading team dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center" style={{ maxWidth: 400 }}>
          <AlertTriangle size={36} className="mx-auto mb-3 text-red-300" />
          <p className="text-sm text-slate-600 font-medium">{error}</p>
          <button onClick={fetchData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="ambient-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', boxShadow: '0 8px 28px rgba(124,58,237,0.35)' }}>
              <Activity size={22} color="white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
                Supervisor Dashboard
              </h1>
              <p className="text-sm text-slate-400">
                Team analytics & leave approvals · <strong className="text-slate-600">{user?.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchData}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-white/80 transition-colors glass"
            >
              <RefreshCw size={16} className="text-slate-400" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('self_service')}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <CalendarDays size={14} /> My Leaves
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </motion.div>

        {/* ── Widget E: Stat Cards (Top Strip) ─────────────────── */}
        <div className="mb-6">
          <StatCards stats={data.stats} />
        </div>

        {/* ── Main Grid ───────────────────────────────────────────  */}
        <div className="grid grid-cols-12 gap-5">

          {/* LEFT: Availability + Heatmap */}
          <div className="col-span-4 space-y-5">
            <AvailabilityWidget data={data.todaysAvailability} />
            <BradfordWidget data={data.bradfordFactor} />
          </div>

          {/* CENTER + RIGHT: Heatmap + Pending */}
          <div className="col-span-8 space-y-5">
            <HeatmapWidget days={data.next7Days} />
            <PendingApprovalsWidget
              applications={data.pendingApprovals}
              onReview={(app) => setReviewApp(app)}
            />
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6"><TeamProfileRequests/></div>
      {/* Approval Modal */}
      <AnimatePresence>
        {reviewApp && (
          <ApprovalModal
            application={reviewApp}
            onClose={() => setReviewApp(null)}
            onAction={handleApproval}
          />
        )}
      </AnimatePresence>

      {/* ─── Inline Error Banner ─── */}
      {actionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl shadow-2xl max-w-lg">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="text-sm font-medium flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-white/70 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
