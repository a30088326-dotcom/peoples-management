import { CalendarDays, Coffee, Heart, Briefcase, Baby, Ban } from 'lucide-react';
import type { LeaveEntitlementData } from '../../../../lib/api';

const LEAVE_ICONS: Record<string, React.ReactNode> = {
  ANNUAL: <CalendarDays size={18} />,
  CASUAL: <Coffee size={18} />,
  MEDICAL: <Heart size={18} />,
  MATERNITY: <Baby size={18} />,
  PATERNITY: <Baby size={18} />,
  NOPAY: <Ban size={18} />,
  DEFAULT: <Briefcase size={18} />,
};

export default function BalanceCard({ ent }: { ent: LeaveEntitlementData }) {
  const available = Math.max(0, ent.totalDays + ent.carryForwardDays - ent.usedDays - ent.pendingDays);
  const usedPct = ent.totalDays > 0 ? ((ent.usedDays + ent.pendingDays) / (ent.totalDays + ent.carryForwardDays)) * 100 : 0;
  const icon = LEAVE_ICONS[ent.leaveType.code] ?? LEAVE_ICONS.DEFAULT;

  return (
    <div className="card card-hover p-4 anim-fade-up" style={{ padding: '1.25rem' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${ent.leaveType.color}18`, color: ent.leaveType.color }}>
          {icon}
        </div>
        <span className="text-2xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.04em' }}>
          {available.toFixed(available % 1 === 0 ? 0 : 1)}
        </span>
      </div>
      <p className="font-semibold text-sm text-slate-700 mb-1">{ent.leaveType.name}</p>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>Used: <strong className="text-slate-600">{ent.usedDays}</strong></span>
        <span>Total: <strong className="text-slate-600">{ent.totalDays + ent.carryForwardDays}</strong></span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(usedPct, 100)}%`,
            background: usedPct > 80 ? '#ef4444' : usedPct > 50 ? '#f59e0b' : ent.leaveType.color,
          }}
        />
      </div>
      {ent.pendingDays > 0 && (
        <p className="text-[10px] text-amber-500 mt-1.5 font-semibold">
          ⏳ {ent.pendingDays} day(s) pending approval
        </p>
      )}
      {ent.carryForwardDays > 0 && (
        <p className="text-[10px] text-blue-400 mt-0.5 font-semibold">
          + {ent.carryForwardDays} CF days
        </p>
      )}
    </div>
  );
}
