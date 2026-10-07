import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, CheckCircle2, XCircle, AlertTriangle, Loader2, X, Check, AlertCircle } from 'lucide-react';
import type { PendingApprovalData } from '../../../../lib/api';

export default function ApprovalModal({
  application,
  onClose,
  onAction,
}: {
  application: PendingApprovalData;
  onClose: () => void;
  onAction: (id: string, action: 'APPROVED' | 'REJECTED', reason?: string) => Promise<void>;
}) {
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!action) return;
    setLoading(true);
    await onAction(application.id, action, action === 'REJECTED' ? reason : undefined);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="card"
        style={{ maxWidth: 480, width: '100%', padding: '2rem' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `${application.leaveType.color}15`, color: application.leaveType.color }}>
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Review Leave Request</h3>
              <p className="text-xs text-slate-400">{application.applicant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Details */}
        <div className="p-4 rounded-2xl mb-4" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Leave Type</span>
              <p className="font-semibold text-slate-800 mt-0.5">{application.leaveType.name}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Duration</span>
              <p className="font-semibold text-slate-800 mt-0.5">{application.totalDays} day{application.totalDays !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Start</span>
              <p className="font-semibold text-slate-800 mt-0.5">{new Date(application.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">End</span>
              <p className="font-semibold text-slate-800 mt-0.5">{new Date(application.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          {application.reason && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Reason</span>
              <p className="text-xs text-slate-600 mt-0.5">{application.reason}</p>
            </div>
          )}
        </div>

        {/* Clash Warning */}
        {application.clashWarning && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Schedule Clash Detected</p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                {application.clashWith.join(', ')} {application.clashWith.length === 1 ? 'is' : 'are'} also on leave during this period.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAction('APPROVED')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: action === 'APPROVED' ? '#dcfce7' : 'white',
              border: action === 'APPROVED' ? '2px solid #22c55e' : '2px solid #e2e8f0',
              color: action === 'APPROVED' ? '#15803d' : '#64748b',
            }}>
            <CheckCircle2 size={16} /> Approve
          </button>
          <button
            onClick={() => setAction('REJECTED')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: action === 'REJECTED' ? '#fee2e2' : 'white',
              border: action === 'REJECTED' ? '2px solid #ef4444' : '2px solid #e2e8f0',
              color: action === 'REJECTED' ? '#dc2626' : '#64748b',
            }}>
            <XCircle size={16} /> Reject
          </button>
        </div>

        {/* Rejection reason */}
        <AnimatePresence>
          {action === 'REJECTED' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mb-4">
                <label className="input-label">Rejection Reason</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Provide reason for rejection..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!action || loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ padding: '0.875rem', opacity: !action ? 0.5 : 1 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {loading ? 'Processing...' : action === 'APPROVED' ? 'Confirm Approval' : action === 'REJECTED' ? 'Confirm Rejection' : 'Select Action'}
        </button>
      </motion.div>
    </div>
  );
}
