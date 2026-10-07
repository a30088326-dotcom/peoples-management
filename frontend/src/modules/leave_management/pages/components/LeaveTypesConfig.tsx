import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, Edit2, Trash2, X } from 'lucide-react';
import { useToast } from '../../../../components/ui/ToastProvider';
import { api } from '../../../../lib/api/client';

export default function LeaveTypesConfig() {
  const { showToast } = useToast();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultFormData = {
    name: 'Annual Leave',
    code: 'AL',
    category: 'Planned Leave',
    unit: 'Working Days',
    paymentType: 'Paid',
    yearlyEntitlement: 14,
    allowFullDay: true,
    allowHalfDays: true,
    showReason: true,
    requireAttachment: false,
    isActive: true
  };
  
  const [formData, setFormData] = useState(defaultFormData);

  const fetchTypes = async () => {
    try {
      const { data: json } = await api.get('/api/leave-management/types');
      if (json.success) setTypes(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(f => ({ ...f, [name]: checked }));
    } else {
      setFormData(f => ({ ...f, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let json;
      if (editingId) {
        const { data } = await api.put(`/api/leave-management/types/${editingId}`, formData);
        json = data;
      } else {
        const { data } = await api.post('/api/leave-management/types', formData);
        json = data;
      }
      
      if (json.success) {
        showToast(editingId ? 'Leave Type updated successfully!' : 'Leave Type saved successfully!', 'success');
        fetchTypes();
        handleCancelEdit();
      } else {
        showToast(json.message || 'Error occurred', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      code: type.code,
      category: type.category,
      unit: type.unit,
      paymentType: type.paymentType,
      yearlyEntitlement: type.yearlyEntitlement,
      allowFullDay: type.allowFullDay,
      allowHalfDays: type.allowHalfDays,
      showReason: type.showReason,
      requireAttachment: type.requireAttachment,
      isActive: type.isActive
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(defaultFormData);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) return;
    try {
      const { data: json } = await api.delete(`/api/leave-management/types/${id}`);
      if (json.success) {
        showToast('Leave Type deleted successfully!', 'success');
        fetchTypes();
      } else {
        showToast(json.message || 'Error deleting leave type', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error deleting leave type', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* List Existing */}
      <div className="card glass p-6 space-y-4">
        <h3 className="font-bold text-slate-800">Existing Leave Types</h3>
        {types.length === 0 ? (
          <p className="text-sm text-slate-400">No leave types defined yet.</p>
        ) : (
          <div className="space-y-3">
            {types.map(t => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 mr-2">{t.name}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">{t.code}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {t.category} • {t.unit} • {t.paymentType}
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                  {t.allowFullDay && <span>Full-Day</span>}
                  {t.allowHalfDays && <span>Half-Day</span>}
                  {t.showReason && <span>Needs Reason</span>}
                  {t.requireAttachment && <span>Needs Doc</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Form */}
      <div className="card glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">{editingId ? 'Edit Leave Type' : 'Create Leave Type'}</h3>
          {editingId && (
            <button onClick={handleCancelEdit} className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X size={14} /> Cancel
            </button>
          )}
        </div>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Leave Type Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="e.g. Annual Leave" required />
            </div>
            <div>
              <label className="input-label">Leave Type Code</label>
              <input type="text" name="code" value={formData.code} onChange={handleChange} className="input-field" placeholder="e.g. AL" required />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="input-field">
                <option value="Planned Leave">Planned Leave</option>
                <option value="Unplanned Leave">Unplanned Leave</option>
                <option value="Statutory Leave">Statutory Leave</option>
              </select>
            </div>
            <div>
              <label className="input-label">Unit</label>
              <select name="unit" value={formData.unit} onChange={handleChange} className="input-field">
                <option value="Working Days">Working Days</option>
                <option value="Calendar Days">Calendar Days</option>
                <option value="Hours">Hours</option>
              </select>
            </div>
            <div>
              <label className="input-label">Payment Type</label>
              <select name="paymentType" value={formData.paymentType} onChange={handleChange} className="input-field">
                <option value="Paid">Paid</option>
                <option value="Half Paid">Half Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="input-label">Default Amount</label>
              <input type="number" name="yearlyEntitlement" value={formData.yearlyEntitlement} onChange={handleChange} className="input-field" placeholder="e.g. 14" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300">
              <input type="checkbox" name="allowFullDay" checked={formData.allowFullDay} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Allow Full Day</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300">
              <input type="checkbox" name="allowHalfDays" checked={formData.allowHalfDays} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Allow Half Day</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300">
              <input type="checkbox" name="showReason" checked={formData.showReason} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Reason Required</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300">
              <input type="checkbox" name="requireAttachment" checked={formData.requireAttachment} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Document Required</span>
            </label>
          </div>
          
          <div>
            <label className="input-label">Status</label>
            <select name="isActive" value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.value === 'true' }))} className="input-field w-1/2">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button disabled={loading} type="submit" className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingId ? 'Update Leave Type' : 'Save Leave Type'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
