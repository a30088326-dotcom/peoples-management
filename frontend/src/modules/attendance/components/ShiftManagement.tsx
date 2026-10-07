import React, { useState, useEffect } from 'react';
import { Settings2, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { attendanceApi, type Shift } from '../api/attendanceApi';
import ShiftModal from './ShiftModal';

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [initialShiftData, setInitialShiftData] = useState<Partial<Shift> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getShifts();
      setShifts(res.data.data);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setError('Could not load shifts. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreateClick = () => {
    setSelectedShift(null);
    setInitialShiftData(null);
    setModalOpen(true);
  };

  const handleEditClick = (shift: Shift) => {
    setSelectedShift(shift);
    setInitialShiftData(null);
    setModalOpen(true);
  };

  const handleEditGroupClick = (group: Shift[]) => {
    setSelectedShift(group[0]);
    setInitialShiftData({ relatedShifts: group } as Partial<Shift>);
    setModalOpen(true);
  };

  const handleDeleteShift = async (group: Shift[]) => {
    const shift = group[0];
    if (window.confirm(`Delete ${shift.code} (${group.map(item => item.name).join(', ')})? Existing roster schedules and attendance history will be kept.`)) {
      setDeletingId(shift.id);
      setError('');
      setSuccess('');
      try {
        const response = await attendanceApi.deleteShift(shift.id, true);
        setSuccess(response.data.message);
        await fetchShifts();
      } catch (err: any) {
        console.error('Failed to delete shift', err);
        setError(err.response?.data?.message || 'Could not delete shift. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleModalClose = (refresh: boolean) => {
    setModalOpen(false);
    setSelectedShift(null);
    setInitialShiftData(null);
    if (refresh) fetchShifts();
  };

  const normalizeShiftCode = (code: string | undefined, fallback: string) => (code || fallback).trim().toLowerCase();

  const shiftGroups = Object.values(shifts.reduce<Record<string, Shift[]>>((groups, shift) => {
    const key = normalizeShiftCode(shift.code, shift.id);
    groups[key] = groups[key] || [];
    groups[key].push(shift);
    return groups;
  }, {})).map(group => group.sort((first, second) =>
    new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime()
  ));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-indigo-600" /> Shift Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure reusable work-time templates and rules</p>
        </div>
        <button 
          onClick={handleCreateClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Create Shift
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Shift Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Timings</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto text-indigo-500" />
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No shifts configured yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                shiftGroups.map(group => {
                  const shift = group[0];

                  return (
                  <tr key={shift.code || shift.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 align-top font-mono text-slate-600">{shift.code.trim()}</td>
                    <td className="px-6 py-4 align-top font-medium text-slate-800">
                      <div className="flex flex-col gap-3">
                        {group.map(groupedShift => (
                          <span key={groupedShift.id} className="truncate">{groupedShift.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {shift.shiftType}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-slate-600">
                      <div className="flex flex-col gap-3">
                        {group.map(groupedShift => <span key={groupedShift.id}>{groupedShift.startTime} - {groupedShift.endTime} {Boolean(groupedShift.crossMidnight) && <span className="text-xs text-indigo-500 ml-1">(+1d)</span>}</span>)}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-slate-600">
                      <div className="flex flex-col gap-3">
                        {group.map(groupedShift => <span key={groupedShift.id}>{Number(groupedShift.totalHours) || '—'}{Number(groupedShift.totalHours) > 0 ? ' hrs' : ''}</span>)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${shift.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {shift.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditGroupClick(group)}
                          disabled={deletingId !== null}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit shifts for this code"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(group)}
                          disabled={deletingId !== null}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title={`Delete shifts for ${shift.code}`}
                          aria-label={`Delete shifts for ${shift.code}`}
                        >
                          {deletingId === shift.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && <ShiftModal shift={selectedShift} initialData={initialShiftData} onClose={handleModalClose} />}
    </div>
  );
}
