import { useState } from 'react';
import { CalendarDays, Coffee, Heart, Briefcase, Baby, Ban, Clock, CheckCircle2, XCircle, X, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import type { LeaveApplicationData } from '../../../../lib/api';

const LEAVE_ICONS: Record<string, React.ReactNode> = {
  ANNUAL: <CalendarDays size={18} />,
  CASUAL: <Coffee size={18} />,
  MEDICAL: <Heart size={18} />,
  MATERNITY: <Baby size={18} />,
  PATERNITY: <Baby size={18} />,
  NOPAY: <Ban size={18} />,
  DEFAULT: <Briefcase size={18} />,
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: '#fef9c3', color: '#a16207', icon: <Clock size={11} /> },
  APPROVED:  { label: 'Approved',  bg: '#dcfce7', color: '#15803d', icon: <CheckCircle2 size={11} /> },
  REJECTED:  { label: 'Rejected',  bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={11} /> },
  CANCELLED: { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b', icon: <X size={11} /> },
  REVISING:  { label: 'Revising',  bg: '#ede9fe', color: '#6d28d9', icon: <RefreshCw size={11} /> },
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryRow({ app, onCancel }: { app: LeaveApplicationData; onCancel: (id: string) => void }) {
  const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(app.id);
    setCancelling(false);
  };

  return (
    <div className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${app.leaveType.color}15`, color: app.leaveType.color }}>
          {LEAVE_ICONS[app.leaveType.code] ?? LEAVE_ICONS.DEFAULT}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="font-semibold text-sm text-slate-800">{app.leaveType.name}</p>
            <span className="badge flex items-center gap-1 text-[10px]"
              style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 12 }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {formatDate(app.startDate)} — {formatDate(app.endDate)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {app.totalDays} day{app.totalDays !== 1 ? 's' : ''} · {app.halfDayType !== 'NONE' ? app.halfDayType.replace('_', ' ') : 'Full Day'}
          </p>
          {app.reason && <p className="text-xs text-slate-400 truncate mt-0.5">"{app.reason}"</p>}
        </div>
      </div>
      {app.status === 'PENDING' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-2 ml-12 text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
        >
          {cancelling ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />} Cancel Leave
        </button>
      )}
      {app.status === 'REJECTED' && app.rejectedReason && (
        <div className="mt-2 ml-12 flex items-start gap-1.5">
          <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-500">{app.rejectedReason}</p>
        </div>
      )}
    </div>
  );
}
