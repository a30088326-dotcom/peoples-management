import React, { useState, useEffect } from 'react';
import { Edit2, Layers, Plus, Loader2, Trash2 } from 'lucide-react';
import { eimApi } from '../../../lib/api/eimApi';

export default function DynamicFields() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormData = {
    fieldName: '', fieldLabel: '', fieldType: 'Text', applicableModule: 'Employee Information',
    isMandatory: false, displayOrder: 0, isActive: true
  };
  const [formData, setFormData] = useState(initialFormData);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await eimApi.getDynamicFields();
      setFields(res.data.data);
    } catch(e) {} finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await eimApi.deleteDynamicField(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await eimApi.updateDynamicField(editingId, formData);
      } else {
        await eimApi.createDynamicField(formData);
      }
      setShowModal(false);
      fetchData();
    } catch(e) { console.error(e); }
  };

  const openAddModal = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (f: any) => {
    setFormData(f);
    setEditingId(f.id);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
            <Layers className="text-indigo-600" size={20} /> Dynamic Fields
          </h3>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus size={16} /> Add Field
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr><th className="px-4 py-3">Internal Name</th><th className="px-4 py-3">Label</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Mandatory</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map(f => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{f.fieldName}</td>
                    <td className="px-4 py-3">{f.fieldLabel}</td>
                    <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{f.fieldType}</span></td>
                    <td className="px-4 py-3">{f.applicableModule}</td>
                    <td className="px-4 py-3">{f.isMandatory ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${f.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{f.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(f)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {fields.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No dynamic fields configured.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">{editingId ? 'Edit' : 'Create'} Dynamic Field</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Field Name (no spaces)</label>
                <input required type="text" value={formData.fieldName} onChange={e => setFormData({...formData, fieldName: e.target.value.replace(/\s/g, '_')})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. custom_shirt_size" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Label</label>
                <input required type="text" value={formData.fieldLabel} onChange={e => setFormData({...formData, fieldLabel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. T-Shirt Size" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Type</label>
                  <select required value={formData.fieldType} onChange={e => setFormData({...formData, fieldType: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    {['Text', 'Number', 'Date', 'Dropdown', 'Radio', 'Checkbox', 'Attachment'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Module</label>
                  <select required value={formData.applicableModule} onChange={e => setFormData({...formData, applicableModule: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="Employee Information">Employee Information</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formData.isMandatory} onChange={e => setFormData({...formData, isMandatory: e.target.checked})} className="rounded text-indigo-600" /> Mandatory Field
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-indigo-600" /> Active
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save Field</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
