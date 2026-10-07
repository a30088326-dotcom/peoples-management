import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserX, BarChart3, Shield,
  Clock, Activity, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, AlertCircle, Eye, Info
} from 'lucide-react';
import type { TeamDashboardData, PendingApprovalData } from '../../../../lib/api';
import DoughnutChart from '../charts/DoughnutChart';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

function getHeatmapColor(pct: number): string {
  if (pct <= 20) return '#dcfce7';
  if (pct <= 40) return '#86efac';
  if (pct <= 60) return '#4ade80';
  if (pct <= 80) return '#22c55e';
  return '#15803d';
}

function getHeatmapTextColor(pct: number): string {
  return pct > 60 ? '#ffffff' : '#15803d';
}

const RISK_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Low':       { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  'Medium':    { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  'High':      { bg: '#fed7aa', color: '#c2410c', border: '#fdba74' },
  'Very High': { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
};

export function AvailabilityWidget({ data }: { data: TeamDashboardData['todaysAvailability'] }) {
  return (
    <motion.div
      custom={0}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="card card-hover glass"
      style={{ padding: '1.75rem' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#22c55e,#10b981)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}>
            <Users size={16} color="white" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">Today's Availability</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recorded today</span>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">{data.notRecorded} team member{data.notRecorded === 1 ? '' : 's'} without an attendance record today.</p>

      <DoughnutChart present={data.present} absent={data.absent} />

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <UserCheck size={16} className="mx-auto mb-1" style={{ color: '#22c55e' }} />
          <p className="text-lg font-black" style={{ color: '#15803d', letterSpacing: '-0.04em' }}>{data.present}</p>
          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Working</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <UserX size={16} className="mx-auto mb-1" style={{ color: '#ef4444' }} />
          <p className="text-lg font-black" style={{ color: '#dc2626', letterSpacing: '-0.04em' }}>{data.absent}</p>
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Out / Absent</p>
        </div>
      </div>

      {data.onLeave.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Who's Out Today</p>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {data.onLeave.map((emp, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: emp.leaveTypeColor }}>
                    {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{emp.name}</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${emp.leaveTypeColor}15`, color: emp.leaveTypeColor }}>
                  {emp.leaveType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function HeatmapWidget({ days }: { days: TeamDashboardData['next7Days'] }) {
  return (
    <motion.div
      custom={1}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="card card-hover glass"
      style={{ padding: '1.75rem' }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
          <BarChart3 size={16} color="white" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-800">Team Availability</h3>
          <p className="text-[10px] text-slate-400">Next 7 days · approved leave plan</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
            className="rounded-2xl p-3 text-center transition-all cursor-default"
            style={{
              background: getHeatmapColor(day.percentage),
              color: getHeatmapTextColor(day.percentage),
              border: i === 0 ? '2px solid rgba(37,99,235,0.4)' : '1px solid transparent',
              boxShadow: i === 0 ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
            }}
            title={`${day.present} present, ${day.absent} absent`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{day.dayName}</p>
            <p className="text-lg font-black mt-1" style={{ letterSpacing: '-0.04em' }}>{day.percentage}%</p>
            <p className="text-[9px] font-semibold opacity-70 mt-0.5">{day.present}/{day.present + day.absent}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
        {[
          { pct: 10, label: '0-20%' },
          { pct: 30, label: '21-40%' },
          { pct: 50, label: '41-60%' },
          { pct: 70, label: '61-80%' },
          { pct: 90, label: '81-100%' },
        ].map((l) => (
          <div key={l.pct} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: getHeatmapColor(l.pct) }} />
            <span className="text-[9px] text-slate-400 font-semibold">{l.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function BradfordWidget({ data }: { data: TeamDashboardData['bradfordFactor'] }) {
  return (
    <motion.div
      custom={2}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="card card-hover glass"
      style={{ padding: '1.75rem' }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}>
          <Shield size={16} color="white" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-800">Bradford Factor Analysis</h3>
          <p className="text-[10px] text-slate-400">Recorded absences, past 365 days · S² × D</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-10 text-center">
          <CheckCircle2 size={32} className="text-green-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No recorded absent days in the past year.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {data.map((emp, i) => {
            const riskStyle = RISK_COLORS[emp.risk] ?? RISK_COLORS['Low'];
            return (
              <motion.div
                key={emp.userId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50/60"
                style={{ border: '1px solid #f1f5f9' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${riskStyle.color}cc,${riskStyle.color})` }}>
                  {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-400">{emp.episodes} episodes · {emp.totalDays} days</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black" style={{ color: riskStyle.color, letterSpacing: '-0.03em' }}>{emp.score}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: riskStyle.bg, color: riskStyle.color, border: `1px solid ${riskStyle.border}` }}>
                    {emp.risk}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-start gap-2">
          <Info size={12} className="text-slate-300 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400">
            <strong>Bradford Factor</strong> = Days × Episodes². Scores above 200 indicate disruptive absence patterns.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function PendingApprovalsWidget({
  applications,
  onReview,
}: {
  applications: PendingApprovalData[];
  onReview: (app: PendingApprovalData) => void;
}) {
  return (
    <motion.div
      custom={3}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="card glass"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            <Clock size={16} color="white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">Pending Approvals</h3>
            <p className="text-[10px] text-slate-400">{applications.length} request{applications.length !== 1 ? 's' : ''} awaiting</p>
          </div>
        </div>
        {applications.length > 0 && (
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
            {applications.length}
          </span>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="px-6 pb-6 pt-4 text-center">
          <CheckCircle2 size={36} className="text-green-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">All caught up!</p>
          <p className="text-xs text-slate-300 mt-0.5">No pending leave requests.</p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          {applications.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${app.leaveType.color},${app.leaveType.color}cc)` }}>
                  {app.applicant.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-slate-800">{app.applicant.name}</p>
                    {app.clashWarning && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 px-1.5 py-0.5 rounded-full"
                        style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                        <AlertTriangle size={9} /> Clash
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: app.leaveType.color }} />
                    {app.leaveType.name} · {app.totalDays} day{app.totalDays !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(app.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(app.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {app.reason && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate italic">"{app.reason}"</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onReview(app)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all"
                    style={{
                      background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                    }}
                    title="Review"
                  >
                    <Eye size={14} />
                  </motion.button>
                </div>
              </div>

              {app.clashWarning && app.clashWith.length > 0 && (
                <div className="ml-13 mt-2 flex items-center gap-1.5" style={{ marginLeft: 52 }}>
                  <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-600">
                    Overlaps with: <strong>{app.clashWith.join(', ')}</strong>
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function StatCards({ stats }: { stats: TeamDashboardData['stats'] }) {
  const cards = [
    {
      label: 'Past-year Leave Average',
      value: `${stats.teamLeaveAvg} days`,
      icon: <TrendingUp size={18} />,
      color: '#2563eb',
      gradient: 'linear-gradient(135deg,#2563eb,#6366f1)',
    },
    {
      label: '30-day Absence Rate',
      value: `${stats.absenceRate}%`,
      icon: <Activity size={18} />,
      color: stats.absenceRate > 5 ? '#ef4444' : '#22c55e',
      gradient: stats.absenceRate > 5 ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'linear-gradient(135deg,#22c55e,#10b981)',
    },
    {
      label: 'Pending Requests',
      value: stats.totalPendingCount.toString(),
      icon: <Clock size={18} />,
      color: stats.totalPendingCount > 0 ? '#f59e0b' : '#22c55e',
      gradient: stats.totalPendingCount > 0 ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'linear-gradient(135deg,#22c55e,#10b981)',
    },
    {
      label: 'On Leave Today',
      value: stats.totalOnLeaveToday.toString(),
      icon: <UserX size={18} />,
      color: stats.totalOnLeaveToday > 0 ? '#7c3aed' : '#22c55e',
      gradient: stats.totalOnLeaveToday > 0 ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#22c55e,#10b981)',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="card card-hover glass"
          style={{ padding: '1.25rem' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ background: card.gradient, boxShadow: `0 4px 16px ${card.color}30` }}>
              {card.icon}
            </div>
          </div>
          <p className="text-2xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.04em' }}>{card.value}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
