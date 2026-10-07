import { useEffect, useRef, useState } from 'react';
import type { FormEvent, PointerEvent } from 'react';
import { Calendar, GripVertical, Loader2, X } from 'lucide-react';
import { attendanceApi, type RosterGroup, type RosterGroupPayload, type Shift } from '../api/attendanceApi';

interface Props {
  group: RosterGroup | null;
  onClose: (refresh: boolean) => void;
}

const months = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleString('en', { month: 'long' })
);

const isOffShift = (shift: Shift) => /(^|[\s_-])off([\s_-]|$)/i.test(`${shift.code} ${shift.name}`);
const shiftGroupKey = (shift: Shift) => (shift.code.trim() || shift.id).toLowerCase();

export default function RosterGroupModal({ group, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  const [formData, setFormData] = useState<Partial<RosterGroup>>({
    name: '', description: '', rosterCycle: 'Monthly', minRestHours: 8,
    maxConsecutiveDays: 6, maxWeeklyHours: 48,
    applicableEmploymentTypes: ['Permanent', 'Contract', 'Probation'], status: 'Draft',
    ...group,
  });
  const [defaultShiftId, setDefaultShiftId] = useState(
    group?.shifts?.find(shift => shift.isDefault)?.id || group?.shifts?.[0]?.id || ''
  );
  const [calendarChoice, setCalendarChoice] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarAssignments, setCalendarAssignments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    group?.calendarAssignments?.forEach(assignment => {
      if (assignment.isOffDay) initial[assignment.date] = 'OFF';
      else if (assignment.shiftId) initial[assignment.date] = assignment.shiftId;
    });
    return initial;
  });
  const [changedDates, setChangedDates] = useState<string[]>([]);
  const draggedChoice = useRef<string | null>(null);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; active: boolean } | null>(null);
  const dragSource = useRef<HTMLButtonElement | null>(null);
  const dragReady = useRef(false);
  const [isDragReady, setIsDragReady] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [assignmentNotice, setAssignmentNotice] = useState('');

  useEffect(() => {
    attendanceApi.getShifts(true)
      .then(response => {
        const shifts = response.data.data || [];
        setAvailableShifts(shifts);
        const savedDefault = shifts.find(shift => shift.id === defaultShiftId);
        if (savedDefault && !isOffShift(savedDefault)) {
          setCalendarChoice(savedDefault.id);
        }
      })
      .catch(() => setError('Could not load shifts. Please refresh and try again.'));
  }, []);

  const savedShiftIds = new Set([
    ...(group?.shifts?.map(shift => shift.id) || []),
    ...(group?.calendarAssignments?.map(assignment => assignment.shiftId).filter(Boolean) || []),
  ]);
  const shiftOptions = availableShifts.filter(shift => !isOffShift(shift) && (
    shift.status === 'Active' || shift.id === defaultShiftId || savedShiftIds.has(shift.id)
  ));
  const shiftGroups = Object.entries(
    shiftOptions.reduce<Record<string, { code: string; shifts: Shift[] }>>((groups, shift) => {
      const code = shift.code.trim();
      const key = shiftGroupKey(shift);
      groups[key] ||= { code: code || shift.name, shifts: [] };
      groups[key].shifts.push(shift);
      return groups;
    }, {})
  ).map(([key, value]) => ({ key, ...value }));
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const selectedShift = shiftOptions.find(shift => shift.id === calendarChoice);
  const choiceLabel = calendarChoice === 'OFF' ? 'Off day' : calendarChoice === 'CLEAR' ? 'Use default shift' : selectedShift?.name;
  const validChoice = (choice: string) => choice === 'OFF' || choice === 'CLEAR' || shiftOptions.some(shift => shift.id === choice);

  const updateField = (field: keyof RosterGroup, value: string | number) => {
    setFormData(previous => ({ ...previous, [field]: value }));
    setError('');
  };

  const assignDay = (date: string, choice = calendarChoice) => {
    if (loading || !validChoice(choice)) return;
    if (!defaultShiftId && choice !== 'OFF' && choice !== 'CLEAR') setDefaultShiftId(choice);
    setCalendarAssignments(previous => {
      const next = { ...previous };
      if (choice === 'CLEAR') delete next[date];
      else next[date] = choice;
      return next;
    });
    setChangedDates(previous => previous.includes(date) ? previous : [...previous, date]);
    const label = choice === 'OFF' ? 'Off day' : choice === 'CLEAR' ? 'Default shift' : shiftOptions.find(shift => shift.id === choice)?.name;
    setAssignmentNotice(`${label} assigned to ${date}. Save the roster to keep your changes.`);
  };

  const endDrag = () => {
    draggedChoice.current = null;
    dragStart.current = null;
    dragSource.current = null;
    dragReady.current = false;
    setIsDragReady(false);
    setDropDate(null);
    setDragPosition(null);
  };

  const resetDrag = () => {
    endDrag();
  };

  const dateUnderPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const dateButton = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('[data-roster-date]');
    if (!dateButton || !dragSource.current) return null;
    // Only accept dates in this modal's form, not another calendar on the page.
    return dateButton.closest('form') === dragSource.current.closest('form') && !dateButton.disabled
      ? dateButton.dataset.rosterDate || null : null;
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (loading || event.button !== 0 || !event.isPrimary || !validChoice(calendarChoice)) return;
    // Touchpads may synthesize only one held mouse press for tap-tap-and-drag.
    // Capture that press immediately; movement, not a prior dblclick, starts the drag.
    event.preventDefault();
    dragReady.current = false;
    setIsDragReady(false);
    draggedChoice.current = calendarChoice;
    dragSource.current = event.currentTarget;
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const previewDrop = (event: PointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    if (loading || !start || start.pointerId !== event.pointerId || !draggedChoice.current) return;
    if (!start.active && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;
    start.active = true;
    if (!dragReady.current) {
      dragReady.current = true;
      setIsDragReady(true);
    }
    event.preventDefault();
    setDragPosition({ x: event.clientX, y: event.clientY });
    setDropDate(dateUnderPointer(event));
  };

  const dropShift = (event: PointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    const choice = draggedChoice.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    const date = start.active ? dateUnderPointer(event) : null;
    if (choice && date) {
      assignDay(date, choice);
      resetDrag();
    } else {
      // Taps and outside drops do not assign anything or leave the card armed.
      endDrag();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = formData.name?.trim();
    if (!name) { setError('Enter a roster name.'); return; }
    if (!shiftOptions.some(shift => shift.id === defaultShiftId)) {
      setError('Choose a shift before saving the roster.');
      return;
    }

    const shiftIds = [...new Set([
      ...(group?.shifts?.map(shift => shift.id) || []),
      defaultShiftId,
      ...Object.values(calendarAssignments).filter(value => value !== 'OFF'),
    ])];
    const payload: RosterGroupPayload = {
      ...formData,
      name,
      shifts: shiftIds.map((shiftId, index) => ({
        shiftId, isDefault: shiftId === defaultShiftId, displayOrder: index,
      })),
      calendarAssignments: changedDates.map(date => ({
        date,
        shiftId: calendarAssignments[date] && calendarAssignments[date] !== 'OFF' ? calendarAssignments[date] : null,
        isOffDay: calendarAssignments[date] === 'OFF',
        clear: !calendarAssignments[date],
      })),
    };

    setLoading(true);
    setError('');
    try {
      if (group?.id) await attendanceApi.updateRosterGroup(group.id, payload);
      else await attendanceApi.createRosterGroup(payload);
      onClose(true);
    } catch (cause: any) {
      setError(cause.response?.data?.message || 'Could not save the roster. Please check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" />
            {group ? 'Edit Roster' : 'Create Roster'}
          </h3>
          <button type="button" onClick={() => onClose(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form id="roster-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-4">
            <div>
              <label htmlFor="roster-name" className="block text-sm font-semibold text-slate-700 mb-1">Roster Name *</label>
              <input id="roster-name" required autoFocus type="text" maxLength={255} value={formData.name || ''}
                onChange={event => updateField('name', event.target.value)} placeholder="e.g. Operations Day Roster"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label htmlFor="roster-description" className="block text-sm font-semibold text-slate-700 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="roster-description" type="text" value={formData.description || ''}
                onChange={event => updateField('description', event.target.value)} placeholder="Who this roster is for"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="roster-cycle" className="block text-sm font-semibold text-slate-700 mb-1">Roster Cycle</label>
                <select id="roster-cycle" value={formData.rosterCycle || 'Monthly'} onChange={event => updateField('rosterCycle', event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="Weekly">Weekly</option><option value="Biweekly">Biweekly</option><option value="Monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label htmlFor="roster-rest" className="block text-sm font-semibold text-slate-700 mb-1">Minimum Rest (hours)</label>
                <input id="roster-rest" required type="number" min={0} max={24} value={formData.minRestHours ?? 8}
                  onChange={event => updateField('minRestHours', Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label htmlFor="roster-days" className="block text-sm font-semibold text-slate-700 mb-1">Maximum Consecutive Days</label>
                <input id="roster-days" required type="number" min={1} max={31} value={formData.maxConsecutiveDays ?? 6}
                  onChange={event => updateField('maxConsecutiveDays', Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <h4 className="text-sm font-bold text-slate-800 mb-1">Roster Calendar</h4>
            <p id="roster-drag-help" className="text-xs text-slate-500 mb-4">Select a created shift. On a touchpad, double-tap the card, hold the second tap and drag onto a date, then release. With a mouse, press and drag.</p>

            <div className="mb-2">
              <div>
                <label htmlFor="calendar-shift" className="block text-sm font-semibold text-slate-700 mb-1">Created shift</label>
                <select id="calendar-shift" value={calendarChoice} disabled={loading}
                  onChange={event => {
                    const choice = event.target.value;
                    setCalendarChoice(choice);
                    resetDrag();
                    setError('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="">Select a created shift</option>
                  {shiftGroups.map(groupItem => <optgroup key={groupItem.key} label={groupItem.code}>
                    {groupItem.shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name} · {shift.startTime?.slice(0, 5)}–{shift.endTime?.slice(0, 5)}{shift.crossMidnight ? ' (+1 day)' : ''}{shift.status === 'Archived' ? ' (deleted; saved in this roster)' : ''}</option>)}
                  </optgroup>)}
                  <optgroup label="Calendar actions">
                    <option value="OFF">Off day</option>
                    <option value="CLEAR">Use default shift</option>
                  </optgroup>
                </select>
              </div>
            </div>
            {shiftGroups.length === 0 && <p className="text-xs text-amber-700 mt-2">No shifts found. Create one in Shift Management first.</p>}
            {defaultShiftId && <p className="text-xs text-slate-500 mb-4">Unassigned dates use {availableShifts.find(shift => shift.id === defaultShiftId)?.name || 'the saved default shift'} by default.
              {calendarChoice && calendarChoice !== 'OFF' && calendarChoice !== 'CLEAR' && calendarChoice !== defaultShiftId && <button type="button" onClick={() => setDefaultShiftId(calendarChoice)} className="ml-2 font-semibold text-indigo-600 hover:underline">Make selected shift the default</button>}
            </p>}

            {choiceLabel && <div className="sticky top-0 z-10 bg-white py-2 mb-3">
              <button type="button" disabled={loading} draggable={false}
                onDragStart={event => event.preventDefault()}
                onPointerDown={startDrag} onPointerMove={previewDrop} onPointerUp={dropShift}
                onPointerCancel={endDrag} onLostPointerCapture={endDrag}
                onKeyDown={event => { if (event.key === 'Escape') resetDrag(); }}
                aria-pressed={isDragReady}
                aria-label={`Drag ${choiceLabel} to a calendar date`} aria-describedby="roster-drag-help"
                data-testid="roster-shift-drag-card"
                className={`flex w-full touch-none select-none items-center gap-3 rounded-xl border px-3 py-3 text-left cursor-grab active:cursor-grabbing disabled:cursor-default ${isDragReady ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-indigo-200 bg-indigo-50'}`}>
                <GripVertical size={20} className="shrink-0 text-indigo-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-indigo-900">{choiceLabel}</span>
                  {selectedShift && <span className="block text-xs text-indigo-600">{selectedShift.code} · {selectedShift.startTime?.slice(0, 5)}–{selectedShift.endTime?.slice(0, 5)}{selectedShift.crossMidnight ? ' (+1 day)' : ''}</span>}
                </span>
                <span className="shrink-0 text-xs font-medium text-indigo-600">{isDragReady ? 'Release on a date' : 'Hold and drag to a date'}</span>
              </button>
            </div>}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-xs text-slate-500">{choiceLabel ? isDragReady ? `Release ${choiceLabel} on a date. Press Esc to cancel.` : 'Touchpad: double-tap, hold the second tap and drag. No extra click needed.' : 'Select a created shift above to show its card.'}</p>
              <div className="flex gap-2">
                <select aria-label="Calendar month" value={selectedMonth} onChange={event => setSelectedMonth(Number(event.target.value))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                  {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
                </select>
                <input aria-label="Calendar year" type="number" min={2000} max={2100} value={selectedYear}
                  onChange={event => setSelectedYear(Number(event.target.value))} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500">{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-slate-200">
                {Array.from({ length: firstDay }, (_, index) => <div key={`empty-${index}`} className="h-16 bg-slate-50" />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const assigned = calendarAssignments[date];
                  const assignedShift = availableShifts.find(shift => shift.id === assigned);
                  const label = assigned === 'OFF' ? 'Off day' : assignedShift?.name || 'Default shift';
                  return <button key={date} type="button" disabled={loading || !calendarChoice}
                    data-roster-date={date}
                    aria-label={`${date}: ${label}`} title={`${date}: ${label}`}
                    className={`flex h-16 flex-col p-1.5 text-left transition-colors hover:bg-indigo-50 disabled:cursor-default ${dropDate === date ? 'bg-indigo-100 ring-2 ring-inset ring-indigo-500' : 'bg-white'}`}>
                    <span className="text-xs font-semibold text-slate-700">{day}</span>
                    {assigned && <span className={`mt-1 w-full truncate rounded px-1 py-0.5 text-[10px] ${assigned === 'OFF' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>{label}</span>}
                  </button>;
                })}
              </div>
            </div>
            <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-indigo-700">{assignmentNotice}</p>
          </section>
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button type="button" onClick={() => onClose(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg">Cancel</button>
          <button type="submit" form="roster-form" disabled={loading || shiftOptions.length === 0}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {group ? 'Save Roster' : 'Create Roster'}
          </button>
        </div>
      </div>
      {dragPosition && <div aria-hidden="true" data-testid="roster-drag-preview"
        className="pointer-events-none fixed z-[60] max-w-52 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-lg"
        style={{ left: dragPosition.x, top: dragPosition.y, transform: 'translate(-50%, -120%)' }}>
        {draggedChoice.current === 'OFF' ? 'Off day' : draggedChoice.current === 'CLEAR' ? 'Use default shift' : availableShifts.find(shift => shift.id === draggedChoice.current)?.name}
      </div>}
    </div>
  );
}
