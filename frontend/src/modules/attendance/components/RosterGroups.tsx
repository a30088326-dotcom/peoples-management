import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { attendanceApi, type RosterGroup } from '../api/attendanceApi';
import RosterGroupModal from './RosterGroupModal';

export default function RosterGroups() {
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<RosterGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RosterGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getRosterGroups();
      setGroups(res.data.data);
    } catch (err) {
      console.error('Error fetching roster groups:', err);
      setError('Could not refresh rosters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateClick = () => {
    setSelectedGroup(null);
    setModalOpen(true);
  };

  const handleEditClick = (group: RosterGroup) => {
    setSelectedGroup(group);
    setModalOpen(true);
  };

  const handleDeleteGroup = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    setError('');
    setSuccess('');
    try {
      await attendanceApi.deleteRosterGroup(deleteTarget.id);
      setGroups(current => current.filter(group => group.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccess(`“${deleteTarget.name}” deleted. Its employee assignments and calendar have been removed.`);
      await fetchGroups();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Could not delete roster. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = (refresh: boolean) => {
    setModalOpen(false);
    if (refresh) fetchGroups();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" /> Rosters
          </h2>
          <p className="text-sm text-slate-500 mt-1">Create rosters and assign available shifts</p>
        </div>
        <button 
          onClick={handleCreateClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Create Roster
        </button>
      </div>

      {error && <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
      {success && <div role="status" className="p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">{success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            No rosters configured yet.
          </div>
        ) : (
          groups.map(group => {
            const defaultShift = group.shifts?.find(s => s.isDefault) || group.shifts?.[0];
            const workingDays = defaultShift?.weeklyWorkingDays ? (typeof defaultShift.weeklyWorkingDays === 'string' ? JSON.parse(defaultShift.weeklyWorkingDays) : defaultShift.weeklyWorkingDays) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            const offDays = defaultShift?.weeklyOffDays ? (typeof defaultShift.weeklyOffDays === 'string' ? JSON.parse(defaultShift.weeklyOffDays) : defaultShift.weeklyOffDays) : ['Sat', 'Sun'];

            return (
              <div key={group.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col relative">
                {/* Header Pattern */}
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                
                <div className="p-6 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight">{group.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {group.description && <span className="text-xs text-slate-500">{group.description}</span>}
                        {group.departmentName && (
                          <span className="text-xs text-slate-500">• {group.departmentName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button disabled={deleting} aria-label={`Edit ${group.name}`} onClick={() => handleEditClick(group)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50">
                        <Edit2 size={16} />
                      </button>
                      <button disabled={deleting} aria-label={`Delete ${group.name}`} onClick={() => { setDeleteTarget(group); setDeleteError(''); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Shift Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Shift</p>
                        <p className="text-sm font-medium text-slate-800">{defaultShift ? defaultShift.name : 'No Default Shift'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Hours</p>
                        <p className="text-sm font-medium text-slate-800 font-mono">{defaultShift ? `${defaultShift.startTime?.slice(0, 5) || 'N/A'} - ${defaultShift.endTime?.slice(0, 5) || 'N/A'}` : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Working Days</p>
                        <p className="text-sm text-slate-700">{workingDays.length > 4 ? `${workingDays[0]} - ${workingDays[workingDays.length - 1]}` : workingDays.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Weekly Off</p>
                        <p className="text-sm text-emerald-600 font-medium">{offDays.join(' + ')} Off</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Users size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{group.employeeCount || 0} Employees</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    group.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {group.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && <RosterGroupModal group={selectedGroup} onClose={handleModalClose} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-roster-title" aria-describedby="delete-roster-description" className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 id="delete-roster-title" className="text-lg font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-red-600" /> Delete roster?</h3>
              <button disabled={deleting} aria-label="Close delete confirmation" onClick={() => setDeleteTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div id="delete-roster-description" className="p-6 space-y-4 text-sm text-slate-600">
              <p>Permanently delete <strong className="text-slate-800">{deleteTarget.name}</strong>?</p>
              <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-800">
                All employee assignments, calendar dates and shift mappings for this roster will be removed. Employees currently using it will need a new roster assigned.
              </div>
              <p><strong>{deleteTarget.employeeCount || 0}</strong> employees currently assigned. Employee profiles, attendance history and shifts in Shift Management will remain.</p>
              <p className="font-medium text-red-700">This action cannot be undone from this screen.</p>
              {deleteError && <div role="alert" className="text-red-700">{deleteError}</div>}
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button disabled={deleting} onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 disabled:opacity-50">Cancel</button>
              <button disabled={deleting} onClick={handleDeleteGroup} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}{deleting ? 'Deleting…' : 'Delete roster & assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
