import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, Coffee, Heart, Baby, Ban, Briefcase, CalendarDays, TrendingUp, FileText, Loader2, Send } from 'lucide-react';
import { leavesApi, type LeaveTypeData, type LeaveEntitlementData } from '../../../../lib/api';

const LEAVE_ICONS: Record<string, React.ReactNode> = {
  ANNUAL: <CalendarDays size={18} />,
  CASUAL: <Coffee size={18} />,
  MEDICAL: <Heart size={18} />,
  MATERNITY: <Baby size={18} />,
  PATERNITY: <Baby size={18} />,
  NOPAY: <Ban size={18} />,
  DEFAULT: <Briefcase size={18} />,
};

function calculateBusinessDays(start: Date, end: Date): number {
  if (!start || !end || start > end) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

interface ApplyFormProps {
  leaveTypes: LeaveTypeData[];
  entitlements: LeaveEntitlementData[];
  onSuccess: () => void;
}

export default function ApplyForm({ leaveTypes, entitlements, onSuccess }: ApplyFormProps) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDayType, setHalfDayType] = useState<'NONE' | 'FIRST_HALF' | 'SECOND_HALF'>('NONE');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [medCertSubmitted, setMedCertSubmitted] = useState(false);
  const [medCertRefNo, setMedCertRefNo] = useState('');
  const [medCertIssuedDate, setMedCertIssuedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const selectedType = leaveTypes.find(t => t.id === leaveTypeId);
  const entitlement = entitlements.find(e => e.leaveType.id === leaveTypeId);
  const available = entitlement
    ? Math.max(0, Number(entitlement.totalDays) + Number(entitlement.carryForwardDays) - Number(entitlement.usedDays) - Number(entitlement.pendingDays))
    : null;

  const businessDays = startDate && endDate
    ? (halfDayType !== 'NONE' ? 0.5 : calculateBusinessDays(new Date(startDate), new Date(endDate)))
    : 0;

  useEffect(() => {
    if (halfDayType !== 'NONE' && startDate) {
      setEndDate(startDate);
    }
  }, [halfDayType, startDate]);

  const handleSubmit = async () => {
    setFormError('');
    setFormSuccess('');

    if (!leaveTypeId || !startDate || !endDate || businessDays <= 0) {
      setFormError('Please select leave type, start date, and end date.');
      return;
    }

    if (selectedType?.needMedicalCertificate && businessDays > Number(selectedType.maxDaysWithoutMedCert ?? 0) && !medCertSubmitted) {
      setFormError(`Medical certificate is required for ${selectedType.name} exceeding ${selectedType.maxDaysWithoutMedCert} day(s).`);
      return;
    }

    if (selectedType?.showReason && selectedType.commentMandatory && !reason.trim()) {
      setFormError('Reason is required for this leave type.');
      return;
    }

    setSubmitting(true);
    try {
      await leavesApi.apply({
        leaveTypeId,
        startDate,
        endDate,
        totalDays: businessDays,
        halfDayType,
        reason: reason || undefined,
        comments: comments || undefined,
        medCertSubmitted,
        medCertRefNo: medCertRefNo || undefined,
        medCertIssuedDate: medCertIssuedDate || undefined,
      });

      setFormSuccess(`🎉 Leave application submitted! ${businessDays} day(s) of ${selectedType?.name} pending approval.`);
      
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setHalfDayType('NONE');
      setReason('');
      setComments('');
      setMedCertSubmitted(false);
      setMedCertRefNo('');
      setMedCertIssuedDate('');
      
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message ?? 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card anim-fade-up delay-100" style={{ padding: '1.75rem' }}>
      {formSuccess && (
        <div className="flex items-center gap-3 p-3 rounded-xl mb-5 anim-scale-in"
          style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{formSuccess}</p>
        </div>
      )}
      {formError && (
        <div className="flex items-center gap-3 p-3 rounded-xl mb-5 anim-scale-in"
          style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
          <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      <div className="mb-4">
        <label className="input-label">Leave Type <span className="text-red-400">*</span></label>
        <div className="relative">
          <select className="input-field appearance-none" value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)}>
            <option value="">Select leave type...</option>
            {leaveTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {selectedType && entitlement !== undefined && (
        <div className="p-3 rounded-xl mb-4 anim-scale-in"
          style={{ background: `${selectedType.color}08`, border: `1px solid ${selectedType.color}22` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{ color: selectedType.color }}>{LEAVE_ICONS[selectedType.code] ?? LEAVE_ICONS.DEFAULT}</div>
              <span className="text-xs font-semibold" style={{ color: selectedType.color }}>{selectedType.name}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: available === 0 ? '#dc2626' : selectedType.color }}>
              {available?.toFixed(1)} days available
            </span>
          </div>
          {selectedType.needMedicalCertificate && (
            <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> Medical cert required after {selectedType.maxDaysWithoutMedCert} day(s)
            </p>
          )}
        </div>
      )}

      {selectedType?.allowHalfDays && (
        <div className="mb-4">
          <label className="input-label">Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {(['NONE', 'FIRST_HALF', 'SECOND_HALF'] as const).map(v => (
              <button key={v}
                onClick={() => setHalfDayType(v)}
                className="p-2.5 rounded-xl border-2 text-xs font-semibold transition-all"
                style={{
                  borderColor: halfDayType === v ? '#2563eb' : '#e2e8f0',
                  background: halfDayType === v ? 'rgba(37,99,235,0.06)' : 'white',
                  color: halfDayType === v ? '#2563eb' : '#64748b',
                }}>
                {v === 'NONE' ? 'Full Day' : v === 'FIRST_HALF' ? 'Morning Half' : 'Afternoon Half'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`grid ${halfDayType !== 'NONE' ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-4`}>
        <div>
          <label className="input-label">{halfDayType !== 'NONE' ? 'Date' : 'Start Date'} <span className="text-red-400">*</span></label>
          <input type="date" className="input-field" value={startDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => { setStartDate(e.target.value); if (!endDate || halfDayType !== 'NONE') setEndDate(e.target.value); }} />
        </div>
        {halfDayType === 'NONE' && (
          <div>
            <label className="input-label">End Date <span className="text-red-400">*</span></label>
            <input type="date" className="input-field" value={endDate}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={e => setEndDate(e.target.value)} />
          </div>
        )}
      </div>

      {businessDays > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
          style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <TrendingUp size={14} style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: '#2563eb' }}>
            {businessDays} working day{businessDays !== 1 ? 's' : ''} · {halfDayType !== 'NONE' ? halfDayType.replace('_',' ') : 'Full day leave'}
          </p>
          {available !== null && businessDays > available && (
            <span className="ml-auto text-xs text-red-500 font-bold">⚠ Exceeds balance!</span>
          )}
        </div>
      )}

      {selectedType?.showReason !== false && (
        <div className="mb-4">
          <label className="input-label">
            Reason {selectedType?.commentMandatory && <span className="text-red-400">*</span>}
          </label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Enter reason for leave..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>
      )}

      {selectedType?.needMedicalCertificate && businessDays > Number(selectedType.maxDaysWithoutMedCert ?? 0) && (
        <div className="p-4 rounded-xl mb-4" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
          <p className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-1.5">
            <FileText size={13} /> Medical Certificate Required
          </p>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={medCertSubmitted} onChange={e => setMedCertSubmitted(e.target.checked)}
              className="accent-blue-600 w-4 h-4" />
            <span className="text-xs text-amber-800 font-semibold">Medical certificate submitted</span>
          </label>
          {medCertSubmitted && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="input-label text-amber-700">Reference No.</label>
                <input className="input-field text-xs" placeholder="MED-2025-001" value={medCertRefNo}
                  onChange={e => setMedCertRefNo(e.target.value)} />
              </div>
              <div>
                <label className="input-label text-amber-700">Issued Date</label>
                <input type="date" className="input-field text-xs" value={medCertIssuedDate}
                  onChange={e => setMedCertIssuedDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-5">
        <label className="input-label">Additional Comments <span className="text-slate-300">(Optional)</span></label>
        <textarea
          className="input-field"
          rows={2}
          placeholder="Any additional notes for your manager..."
          value={comments}
          onChange={e => setComments(e.target.value)}
          style={{ resize: 'none' }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !leaveTypeId || !startDate || !endDate}
        className="btn-primary btn-primary-pulse w-full flex items-center justify-center gap-2"
        style={{
          padding: '0.875rem',
          opacity: (!leaveTypeId || !startDate || !endDate) && !submitting ? 0.5 : 1,
          cursor: (!leaveTypeId || !startDate || !endDate) && !submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Submitting...</>
          : <><Send size={16} /> Submit Leave Application</>
        }
      </button>
    </div>
  );
}
