import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { attendanceApi, type Shift } from '../api/attendanceApi';

interface Props {
  shift: Shift | null;
  initialData?: Partial<Shift> | null;
  onClose: (refresh: boolean) => void;
}

interface AdditionalShift {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  crossMidnight: boolean;
  totalHours: number;
}

const crossesMidnight = (startTime?: string, endTime?: string, previous = false) => {
  const start = startTime?.slice(0, 5);
  const end = endTime?.slice(0, 5);
  return start && end && start !== end ? end < start : previous;
};

const durationHours = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.slice(0, 5).split(':').map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(':').map(Number);
  return Number(((((endHour * 60 + endMinute) - (startHour * 60 + startMinute) + 1440) % 1440) / 60).toFixed(2));
};

export default function ShiftModal({ shift, initialData, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const relatedShifts = (initialData as Partial<Shift> & { relatedShifts?: Shift[] } | null)?.relatedShifts || [];
  const [additionalShifts, setAdditionalShifts] = useState<AdditionalShift[]>(() => relatedShifts.slice(1).map(relatedShift => ({
    id: relatedShift.id,
    name: relatedShift.name,
    startTime: relatedShift.startTime,
    endTime: relatedShift.endTime,
    crossMidnight: relatedShift.crossMidnight,
    totalHours: Number(relatedShift.totalHours) || durationHours(relatedShift.startTime, relatedShift.endTime),
  })));
  const [formData, setFormData] = useState<Partial<Shift>>(shift || initialData || {
    code: '', name: '', description: '', shiftType: 'Fixed',
    startTime: '09:00', endTime: '18:00', crossMidnight: false,
    totalHours: 9, minWorkingHours: 4, fullDayHours: 8, halfDayHours: 4,
    breakDuration: 1, breakType: 'Unpaid',
    earliestIn: '07:00', latestOut: '20:00',
    graceLate: 15, graceEarly: 15,
    overtimeEligible: true, overtimeStart: 30,
    weeklyWorkingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    weeklyOffDays: ['Saturday', 'Sunday'],
    holidayRule: 'Off', applicableEmploymentTypes: ['Permanent', 'Contract', 'Probation'],
    status: 'Active'
  });

  const normalizePayload = () => {
    const next = {
      ...formData,
      code: String(formData.code ?? '').trim(),
      name: String(formData.name ?? '').trim(),
      description: String(formData.description ?? '').trim(),
      shiftType: formData.shiftType || 'Fixed',
      breakType: formData.breakType || 'Unpaid',
      holidayRule: formData.holidayRule || 'Off',
      status: formData.status || 'Active',
      crossMidnight: crossesMidnight(formData.startTime, formData.endTime, Boolean(formData.crossMidnight)),
      weeklyWorkingDays: Array.isArray(formData.weeklyWorkingDays) ? formData.weeklyWorkingDays : [],
      weeklyOffDays: Array.isArray(formData.weeklyOffDays) ? formData.weeklyOffDays : [],
      applicableEmploymentTypes: Array.isArray(formData.applicableEmploymentTypes) ? formData.applicableEmploymentTypes : [],
    } as Partial<Shift>;

    const numericFields = ['totalHours', 'minWorkingHours', 'fullDayHours', 'halfDayHours', 'breakDuration', 'graceLate', 'graceEarly', 'overtimeStart'] as const;

    numericFields.forEach((field) => {
      const value = Number(next[field]);
      next[field] = Number.isFinite(value) ? value : 0;
    });
    if (!next.totalHours) next.totalHours = durationHours(next.startTime, next.endTime);

    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = normalizePayload();

    if (!payload.code || !payload.name || !payload.startTime || !payload.endTime) {
      setError('Shift code, name, start time and end time are required.');
      return;
    }

    const extraShifts = additionalShifts.map(extra => ({ ...extra, name: extra.name.trim() }));
    if (extraShifts.some(extra => !extra.name || !extra.startTime || !extra.endTime)) {
      setError('Please complete the name, start time and end time for every additional shift.');
      return;
    }

    setLoading(true);
    try {
      let sharedCode = payload.code;
      if (shift?.id) {
        await attendanceApi.updateShift(shift.id, payload);
      } else {
        const response = await attendanceApi.createShift(payload);
        sharedCode = response.data?.data?.code || payload.code;
      }

      await Promise.all(extraShifts.map(extra => {
        const extraPayload = {
          ...payload,
          code: sharedCode,
          name: extra.name,
          startTime: extra.startTime,
          endTime: extra.endTime,
          crossMidnight: crossesMidnight(extra.startTime, extra.endTime, extra.crossMidnight),
          totalHours: Number(extra.totalHours) || durationHours(extra.startTime, extra.endTime),
          allowDuplicateCode: true,
        };
        return extra.id
          ? attendanceApi.updateShift(extra.id, extraPayload)
          : attendanceApi.createShift(extraPayload);
      }));
      onClose(true);
    } catch (err: any) {
      console.error('Error saving shift:', err);
      setError(err?.response?.data?.message || 'Failed to save shift. Please check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Shift, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {shift ? 'Edit Shift' : 'Create New Shift'}
          </h3>
          <button onClick={() => onClose(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shift Code</label>
              <input required type="text" value={formData.code} onChange={e => updateField('code', e.target.value)} disabled={!!shift} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shift Name</label>
              <input required type="text" value={formData.name} onChange={e => updateField('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              {additionalShifts.map((additionalShift, index) => (
                <div key={additionalShift.id || index} className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                  <div className="flex items-center gap-2">
                  <input
                    required
                    type="text"
                    value={additionalShift.name}
                    onChange={e => setAdditionalShifts(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))}
                    placeholder="Additional shift name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setAdditionalShifts(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                    className="shrink-0 px-2 py-2 text-sm text-slate-400 hover:text-red-600"
                    aria-label="Remove additional shift name"
                  >
                    <X size={16} />
                  </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <input
                      required
                      type="time"
                      value={additionalShift.startTime}
                      onChange={e => setAdditionalShifts(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: e.target.value } : item))}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      aria-label="Additional shift start time"
                    />
                    <input
                      required
                      type="time"
                      value={additionalShift.endTime}
                      onChange={e => setAdditionalShifts(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: e.target.value } : item))}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      aria-label="Additional shift end time"
                    />
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.5"
                      value={additionalShift.totalHours}
                      onChange={e => setAdditionalShifts(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, totalHours: parseFloat(e.target.value) } : item))}
                      placeholder="Total hours"
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      aria-label="Additional shift total hours"
                    />
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                    <input type="checkbox" checked={crossesMidnight(additionalShift.startTime, additionalShift.endTime, additionalShift.crossMidnight)} disabled className="rounded border-slate-300 text-indigo-600" />
                    Crosses Midnight (+1d) · automatic from times
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t border-slate-100 pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input required type="time" value={formData.startTime} onChange={e => updateField('startTime', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input required type="time" value={formData.endTime} onChange={e => updateField('endTime', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-6">
              <input type="checkbox" checked={crossesMidnight(formData.startTime, formData.endTime, Boolean(formData.crossMidnight))} disabled className="rounded border-slate-300 text-indigo-600" />
              <label className="text-sm text-slate-600">Crosses Midnight (+1d) · automatic from times</label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t border-slate-100 pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Hours</label>
              <input required type="number" step="0.5" value={formData.totalHours} onChange={e => updateField('totalHours', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Break (Hrs)</label>
              <input required type="number" step="0.5" value={formData.breakDuration} onChange={e => updateField('breakDuration', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Late Grace (Mins)</label>
              <input required type="number" value={formData.graceLate} onChange={e => updateField('graceLate', parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Early Grace (Mins)</label>
              <input required type="number" value={formData.graceEarly} onChange={e => updateField('graceEarly', parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button type="button" onClick={() => onClose(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {shift ? 'Update Shift' : 'Create Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}
