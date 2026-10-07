import React, { useEffect, useState } from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { eimsApi } from '../../../../lib/api/employee_information_audit';

type Props = {
  data: any;
  update: (data: any) => void;
};

export default function AttendanceDetailsTab({
  data,
  update,
}: Props) {
  const [rosterGroups, setRosterGroups] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      eimsApi.getRosterGroups(),
      eimsApi.getShifts(),
    ])
      .then(([rosterResponse, shiftResponse]) => {
        if (!mounted) return;
        setRosterGroups(rosterResponse.data?.data || []);
        setShifts(shiftResponse.data?.data || []);
      })
      .catch((error) => {
        console.error('Attendance master data failed:', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const selectedGroup = rosterGroups.find(
    (group) => group.id === data.rosterGroupId
  );

  const allowedShifts = selectedGroup?.shifts?.length
    ? selectedGroup.shifts
    : shifts;

  const selectedShift = shifts.find(
    (shift) => shift.id === data.shiftId
  );

  const handleRosterChange = (rosterGroupId: string) => {
    const group = rosterGroups.find((item) => item.id === rosterGroupId);
    const defaultShift =
      group?.shifts?.find((shift: any) => Boolean(shift.isDefault)) ||
      group?.shifts?.[0];

    update({
      rosterGroupId,
      shiftId: defaultShift?.id || '',
      rosterGroupName: group?.name || '',
      rosterGroupCode: group?.code || '',
      shiftName: defaultShift?.name || '',
      shiftCode: defaultShift?.code || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <CalendarClock size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Attendance & Roster</h3>
          <p className="text-sm text-slate-500">Assign a roster group and its working shift.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Roster Group</label>
          <select
            value={data.rosterGroupId || ''}
            disabled={loading}
            onChange={(event) => handleRosterChange(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          >
            <option value="">Select Roster Group</option>
            {rosterGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.code} — {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Shift</label>
          <select
            value={data.shiftId || ''}
            onChange={(event) => {
              const shift = shifts.find((item) => item.id === event.target.value);
              update({
                shiftId: event.target.value,
                shiftName: shift?.name || '',
                shiftCode: shift?.code || '',
              });
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          >
            <option value="">Select Shift</option>
            {allowedShifts.map((shift: any) => (
              <option key={shift.id} value={shift.id}>
                {shift.code} — {shift.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Effective From</label>
          <input
            type="date"
            value={data.effectiveStartDate || ''}
            onChange={(event) => update({ effectiveStartDate: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Effective To</label>
          <input
            type="date"
            value={data.effectiveEndDate || ''}
            onChange={(event) => update({ effectiveEndDate: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
      </div>

      {data.rosterGroupId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Roster Group</div>
              <div className="font-semibold text-slate-800">
                {selectedGroup?.name || data.rosterGroupName || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Shift</div>
              <div className="font-semibold text-slate-800">
                {selectedShift?.name || data.shiftName || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Working Time</div>
              <div className="font-semibold text-slate-800">
                {selectedShift ? `${selectedShift.startTime} – ${selectedShift.endTime}` : '-'}
              </div>
            </div>
          </div>
          {!data.shiftId && (
            <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle size={16} className="text-amber-600" />
              <span className="text-xs text-amber-800">
                A valid shift is required before this active roster assignment can be saved.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
