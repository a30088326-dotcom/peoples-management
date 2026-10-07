import { useState, useEffect } from 'react';
import { Save, Loader2, ArrowLeft, Plus, Edit2, Trash2, X } from 'lucide-react';
import { useToast } from '../../../../components/ui/ToastProvider';
import { api } from '../../../../lib/api/client';
import { eimApi } from '../../../../lib/api/eimApi';

export default function LeaveGroupsConfig() {
  const [eimData, setEimData] = useState({ employmentTypes: [] as any[], geography: [] as any[] });
  useEffect(() => {
    Promise.all([eimApi.getEmploymentTypes(), eimApi.getGeography()])
      .then(([eRes, gRes]) => setEimData({ employmentTypes: eRes.data?.data || [], geography: gRes.data?.data || [] }))
      .catch(e => console.error(e));
  }, []);

  const { showToast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultFormData = {
    name: 'Permanent Employee Leave Group',
    code: 'LG-PERMANENT',
    employmentType: 'Permanent',
    country: 'Sri Lanka',
    startingMonth: 1,
    effectiveFrom: '',
    effectiveTo: '',
    isActive: true
  };
  
  const [formData, setFormData] = useState(defaultFormData);

  const [selectedTypes, setSelectedTypes] = useState<{typeId: string, days: number}[]>([]);

  const fetchGroups = async () => {
    try {
      const { data: json } = await api.get('/api/leave-management/groups');
      if (json.success) setGroups(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTypes = async () => {
    try {
      const { data: json } = await api.get('/api/leave-management/types');
      if (json.success) setTypes(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmploymentTypes = async () => {
    try {
      const { data: json } = await api.get('/api/admin/ops/employment-types');
      if (json.success) setEmploymentTypes(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchTypes();
    fetchEmploymentTypes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev => {
      const exists = prev.find(t => t.typeId === typeId);
      if (exists) return prev.filter(t => t.typeId !== typeId);
      return [...prev, { typeId, days: 0 }];
    });
  };

  const updateTypeDays = (typeId: string, days: number) => {
    setSelectedTypes(prev => prev.map(t => t.typeId === typeId ? { ...t, days } : t));
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let json;
      if (editingId) {
        const { data } = await api.put(`/api/leave-management/groups/${editingId}`, formData);
        json = data;
      } else {
        const { data } = await api.post('/api/leave-management/groups', formData);
        json = data;
      }
      
      if (json.success) {
        // Assign selected leave types to the group (Only run this logic if it's a new create)
        if (!editingId) {
          const groupId = json.data.id;
          for (const st of selectedTypes) {
            if (st.days > 0) {
              await api.post(`/api/leave-management/groups/${groupId}/types`, {
                leaveTypeId: st.typeId,
                entitlementDays: st.days,
                unit: 'Working Days',
                allocationMethod: 'Annual',
                allowProration: true,
                allowCarryForward: false,
                carryForwardLimit: 0,
                minimumServiceMonths: 0,
                approvalWorkflow: 'Manager -> HR'
              });
            }
          }
        }
        showToast(editingId ? 'Leave Group updated successfully!' : 'Leave Group saved successfully!', 'success');
        fetchGroups();
        handleCancelEditGroup();
      } else {
        showToast(json.message || 'Error occurred', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = (group: any) => {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      code: group.code,
      employmentType: group.employmentType,
      country: group.country,
      startingMonth: group.startingMonth,
      effectiveFrom: group.effectiveFrom ? group.effectiveFrom.split('T')[0] : '',
      effectiveTo: group.effectiveTo ? group.effectiveTo.split('T')[0] : '',
      isActive: group.isActive
    });
  };

  const handleCancelEditGroup = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setSelectedTypes([]);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this leave group?')) return;
    try {
      const { data: json } = await api.delete(`/api/leave-management/groups/${id}`);
      if (json.success) {
        showToast('Leave Group deleted successfully!', 'success');
        fetchGroups();
      } else {
        showToast(json.message || 'Error deleting leave group', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error deleting leave group', 'error');
    }
  };

  if (selectedGroup) {
    return <AssignLeaveTypeView group={selectedGroup} types={types} onBack={() => { setSelectedGroup(null); fetchGroups(); }} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Existing Groups */}
      <div className="card glass p-6 space-y-4">
        <h3 className="font-bold text-slate-800">Existing Leave Groups</h3>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-400">No leave groups defined yet.</p>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-700">{g.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{g.employmentType} • {g.country}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">{g.code}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditGroup(g)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteGroup(g.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {g.leaveTypes?.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {g.leaveTypes.map((lt: any) => (
                      <div key={lt.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs flex justify-between items-center shadow-sm">
                        <span className="font-semibold text-slate-700 truncate mr-2" title={lt.leaveType?.name}>
                          {lt.leaveType?.name}
                        </span>
                        <span className="text-blue-600 font-bold whitespace-nowrap">
                          {lt.entitlementDays} {lt.unit.replace('Working ', '')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Assigned Types: <span className="font-bold text-slate-700">{g.leaveTypes?.length || 0}</span>
                  </div>
                  <button onClick={() => setSelectedGroup(g)} className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus size={14} /> Add Leave Type
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Form */}
      <div className="card glass p-6 h-fit">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">{editingId ? 'Edit Leave Group' : 'Create Leave Group'}</h3>
          {editingId && (
            <button onClick={handleCancelEditGroup} className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X size={14} /> Cancel
            </button>
          )}
        </div>
        
        <form onSubmit={handleSaveGroup} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Leave Group Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="input-label">Leave Group Code</label>
              <input type="text" name="code" value={formData.code} onChange={handleChange} className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Employment Type</label>
              <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="input-field">
                <option value="All">All Types</option>
                {eimData.employmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Country</label>
              <select name="country" value={formData.country} onChange={handleChange} className="input-field">
                <option value="All">All Geographies</option>
                {eimData.geography.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          {/* Leave Types Selection (Only available when creating new group) */}
          {!editingId && (
            <div>
              <label className="input-label mb-3">Assign Leave Types</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-4 bg-white">
              {types.length === 0 ? (
                <p className="text-sm text-slate-400">No leave types available. Create leave types first.</p>
              ) : (
                types.map((t: any) => {
                  const selected = selectedTypes.find(st => st.typeId === t.id);
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input 
                          type="checkbox" 
                          checked={!!selected}
                          onChange={() => toggleType(t.id)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <div>
                          <span className="font-semibold text-sm text-slate-700">{t.name}</span>
                          <span className="text-xs text-slate-400 ml-2">({t.code})</span>
                        </div>
                      </label>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={selected.days}
                            onChange={(e) => updateTypeDays(t.id, parseFloat(e.target.value) || 0)}
                            className="input-field w-20 text-center text-sm py-1"
                            placeholder="Days"
                          />
                          <span className="text-xs text-slate-500">Days</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {selectedTypes.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">{selectedTypes.length} leave type(s) selected</p>
            )}
          </div>
          )}

          <div>
            <label className="input-label">Status</label>
            <select name="isActive" value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.value === 'true' }))} className="input-field w-1/3">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button disabled={loading} type="submit" className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingId ? 'Update Leave Group' : 'Save Leave Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ASSIGN LEAVE TYPE VIEW ─────────────────────────────────────────────

function AssignLeaveTypeView({ group, types, onBack }: { group: any, types: any[], onBack: () => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    leaveTypeId: types[0]?.id || '',
    entitlementDays: 14,
    unit: 'Working Days',
    allocationMethod: 'Yearly',
    allowProration: true,
    allowCarryForward: true,
    carryForwardLimit: 5,
    minimumServiceMonths: 0,
    maximumConsecutiveDays: 10,
    approvalWorkflow: 'Manager -> HR'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(f => ({ ...f, [name]: checked }));
    } else {
      setFormData(f => ({ ...f, [name]: value }));
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: json } = await api.post(`/api/leave-management/groups/${group.id}/types`, formData);
      if (json.success) {
        showToast('Assigned Leave Type successfully!', 'success');
        onBack();
      } else {
        showToast(json.message || 'Error occurred', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card glass p-6">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3 className="font-bold text-slate-800">Assign Leave Type to {group.name}</h3>
          <p className="text-xs text-slate-400">Define group-specific entitlements</p>
        </div>
      </div>

      {types.length === 0 ? (
        <div className="text-slate-500 text-sm">Please create Leave Types first before assigning.</div>
      ) : (
        <form onSubmit={handleAssign} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="input-label">Leave Type</label>
              <select name="leaveTypeId" value={formData.leaveTypeId} onChange={handleChange} className="input-field" required>
                <option value="">-- Select --</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Entitlement Amount</label>
              <input type="number" name="entitlementDays" value={formData.entitlementDays} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="input-label">Unit</label>
              <select name="unit" value={formData.unit} onChange={handleChange} className="input-field">
                <option value="Working Days">Working Days</option>
                <option value="Calendar Days">Calendar Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="input-label">Allocation Method</label>
              <select name="allocationMethod" value={formData.allocationMethod} onChange={handleChange} className="input-field">
                <option value="Yearly">Yearly</option>
                <option value="Monthly">Monthly</option>
                <option value="Upfront">Upfront</option>
              </select>
            </div>
            <div>
              <label className="input-label">Minimum Service (Months)</label>
              <input type="number" name="minimumServiceMonths" value={formData.minimumServiceMonths} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="input-label">Max Consecutive</label>
              <input type="number" name="maximumConsecutiveDays" value={formData.maximumConsecutiveDays} onChange={handleChange} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300">
              <input type="checkbox" name="allowProration" checked={formData.allowProration} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Allow Proration</span>
            </label>
            <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="allowCarryForward" checked={formData.allowCarryForward} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
                <span className="text-sm font-bold text-slate-700">Allow Carry Forward</span>
              </label>
              {formData.allowCarryForward && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  <span className="text-xs font-semibold text-slate-500">Limit:</span>
                  <input type="number" name="carryForwardLimit" value={formData.carryForwardLimit} onChange={handleChange} className="w-16 px-2 py-1 border border-slate-200 rounded text-sm outline-none" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="input-label">Approval Workflow</label>
            <select name="approvalWorkflow" value={formData.approvalWorkflow} onChange={handleChange} className="input-field w-1/3">
              <option value="Manager -> HR">Manager → HR</option>
              <option value="Direct Manager">Direct Manager</option>
              <option value="Auto Approve">Auto Approve</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button disabled={loading} type="submit" className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Assign Leave Type
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
