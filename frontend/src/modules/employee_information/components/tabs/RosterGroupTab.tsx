import React, { useState, useEffect } from 'react';
import { CalendarClock, Clock, Users, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { api } from '../../../../lib/api/client';

interface RosterGroupTabProps {
  employeeId?: string;
}

export default function RosterGroupTab({ employeeId }: RosterGroupTabProps) {
  const [rosterGroups, setRosterGroups] = useState<any[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [effectiveStartDate, setEffectiveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all roster groups
      const groupsRes = await api.get('/api/attendance/roster-groups');
      if (groupsRes.data?.success) {
        setRosterGroups(groupsRes.data.data);
      }

      // Fetch current assignment for this employee
      if (employeeId) {
        const assignRes = await api.get('/api/attendance/assignments');
        if (assignRes.data?.success) {
          const myAssignment = assignRes.data.data.find(
            (a: any) => a.employeeId === employeeId && a.status === 'Active'
          );
          if (myAssignment) {
            setCurrentAssignment(myAssignment);
            setSelectedGroupId(myAssignment.groupId);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching roster data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!employeeId || !selectedGroupId) return;
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');
      await api.post('/api/attendance/assignments', {
        employeeIds: [employeeId],
        groupId: selectedGroupId,
        effectiveStartDate,
        effectiveEndDate: effectiveEndDate || undefined
      });
      setSuccessMessage('Roster group assigned successfully!');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign roster group.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  };

  if (!employeeId) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
        <Info size={36} className="text-slate-400 mx-auto mb-3 opacity-50" />
        <h3 className="text-base font-bold text-slate-700 mb-1">Save Employee First</h3>
        <p className="text-sm text-slate-500">Please save the employee record before assigning a roster group.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-sm">Loading roster information...</p>
      </div>
    );
  }

  const selectedGroup = rosterGroups.find(g => g.id === selectedGroupId);

  return (
    <div className="space-y-8">
      {/* Current Assignment */}
      {currentAssignment && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Current Active Assignment</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Roster Group</p>
              <p className="text-sm font-bold text-emerald-900">{currentAssignment.groupName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Effective From</p>
              <p className="text-sm font-bold text-emerald-900">
                {currentAssignment.effectiveStartDate ? new Date(currentAssignment.effectiveStartDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Status</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-800 uppercase">
                {currentAssignment.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-sm text-emerald-700 font-medium">
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700 font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Assignment Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          {currentAssignment ? 'Change Roster Group' : 'Assign Roster Group'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Roster Group *</label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select a Roster Group...</option>
              {rosterGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Effective Start Date *</label>
            <input
              type="date"
              value={effectiveStartDate}
              onChange={e => setEffectiveStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Effective End Date</label>
            <input
              type="date"
              value={effectiveEndDate}
              onChange={e => setEffectiveEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleAssign}
            disabled={saving || !selectedGroupId || !effectiveStartDate}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? 'Assigning...' : currentAssignment ? 'Update Assignment' : 'Assign Roster Group'}
          </button>
        </div>
      </div>

      {/* Shift Preview */}
      {selectedGroup && selectedGroup.shifts && selectedGroup.shifts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
            <CalendarClock size={16} className="text-blue-600" />
            Shifts in "{selectedGroup.name}"
          </h3>

          <div className="grid gap-4">
            {selectedGroup.shifts.map((shift: any) => (
              <div 
                key={shift.id}
                className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800">{shift.name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600 uppercase">{shift.code}</span>
                      {shift.isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{shift.shiftType}{shift.crossMidnight ? ' • Cross Midnight' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Start</p>
                    <p className="text-sm font-bold text-emerald-700 flex items-center gap-1"><Clock size={12} /> {formatTime(shift.startTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">End</p>
                    <p className="text-sm font-bold text-amber-700 flex items-center gap-1"><Clock size={12} /> {formatTime(shift.endTime)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rosterGroups.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
          <AlertCircle size={36} className="text-slate-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-slate-700 mb-1">No Roster Groups Available</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Please create roster groups in the Attendance & Roster module first.
          </p>
        </div>
      )}
    </div>
  );
}
