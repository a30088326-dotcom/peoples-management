import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react';
import type { PendingApprovalData } from '../../../../lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function PendingApprovalsWidget({
  applications,
  onReview,
}: {
  applications: PendingApprovalData[];
  onReview: (app: PendingApprovalData) => void;
}) {
  return (
    <motion.div
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
                    className="app-action w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all app-action-icon"
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
