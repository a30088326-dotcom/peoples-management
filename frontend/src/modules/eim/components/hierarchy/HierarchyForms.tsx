import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { eimApi } from '../../../../lib/api/eimApi';

interface AddEditNodeFormProps {
  node?: any;
  parentId?: string;
  hierarchyConfig: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEditNodeForm({ node, parentId, hierarchyConfig, onClose, onSuccess }: AddEditNodeFormProps) {
  const isEdit = !!node;
  const [formData, setFormData] = useState({
    name: node?.name || '',
    code: node?.code || '',
    structureType: node?.structureType || '',
    description: node?.description || '',
    headPositionId: node?.headPositionId || '',
    effectiveStartDate: node?.effectiveStartDate || '',
    effectiveEndDate: node?.effectiveEndDate || '',
    isActive: node ? node.isActive : true,
    parentId: node?.parentId || parentId || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enabledLevels = hierarchyConfig.filter(c => c.is_enabled).sort((a, b) => a.level_order - b.level_order);
  const currentLevelIndex = parentId ? enabledLevels.findIndex(c => c.id === 'DEPARTMENT') : 0; // TODO calculate actual parent level

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await eimApi.updateStructure(node.id, formData);
      } else {
        await eimApi.createStructure(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Unit' : 'Add Unit'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Unit Code *</label>
              <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Unit Type *</label>
              <select required value={formData.structureType} onChange={e => setFormData({...formData, structureType: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50">
                <option value="">Select Type</option>
                {enabledLevels.map(l => <option key={l.id} value={l.level_name}>{l.level_name}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Unit Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
            <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Unit Head (Employee ID)</label>
            <input type="text" value={formData.headPositionId} onChange={e => setFormData({...formData, headPositionId: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
              <input type="date" value={formData.effectiveStartDate} onChange={e => setFormData({...formData, effectiveStartDate: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
              <input type="date" value={formData.effectiveEndDate} onChange={e => setFormData({...formData, effectiveEndDate: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700">
              <Save size={16}/> {loading ? 'Saving...' : 'Save Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MoveNodeFormProps {
  node: any;
  structures: any[];
  hierarchyConfig: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveNodeForm({ node, structures, hierarchyConfig, onClose, onSuccess }: MoveNodeFormProps) {
  const [newParentId, setNewParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentParent = structures.find(s => s.id === node.parentId);
  const newParent = structures.find(s => s.id === newParentId);

  // Filter valid parents (basic rule: don't move into self or children)
  const isDescendant = (childId: string, parentId: string): boolean => {
    if (childId === parentId) return true;
    const child = structures.find(s => s.id === childId);
    if (!child || !child.parentId) return false;
    return isDescendant(child.parentId, parentId);
  };
  
  const validParents = structures.filter(s => s.id !== node.id && !isDescendant(s.id, node.id));

  const countDescendants = (parentId: string): number => {
    const children = structures.filter(s => s.parentId === parentId);
    return children.length + children.reduce((acc, child) => acc + countDescendants(child.id), 0);
  };
  const affectedChildrenCount = countDescendants(node.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentId) { setError('Select a new parent'); return; }
    
    setLoading(true);
    try {
      await eimApi.updateStructureParent(node.id, newParentId);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Move failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800">Move Unit</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"><X size={18} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 border border-blue-200">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              Moving <span className="font-bold">{node.name}</span> will also move all its <strong>{affectedChildrenCount} child units</strong> to the new location.
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Current Parent</label>
            <div className="p-2 border rounded-lg bg-slate-100 text-slate-500 text-sm font-medium">{currentParent ? currentParent.name : 'Root (None)'}</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">New Parent Unit *</label>
            <select required value={newParentId} onChange={e => setNewParentId(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-slate-50">
              <option value="">Select new parent</option>
              {validParents.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.structureType})</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading || !newParentId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
              <Save size={16}/> {loading ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
