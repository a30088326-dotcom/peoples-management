import React, { useState } from 'react';
import { Network, Plus, List, FolderTree, GripVertical, Save, X, Loader2 } from 'lucide-react';
import { eimApi } from '../../../lib/api/eimApi';

interface Props {
  structures: any[];
  onAdd: () => void;
  onRefresh: () => void;
}

export default function HierarchyTree({ structures, onAdd, onRefresh }: Props) {
  const [view, setView] = useState<'tree' | 'list'>('tree');
  
  // Local state for drag and drop preview
  const [localStructures, setLocalStructures] = useState(structures);
  const [pendingChanges, setPendingChanges] = useState<{id: string, parentId: string|null} | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync when props change if no pending changes
  React.useEffect(() => {
    if (!pendingChanges) setLocalStructures(structures);
  }, [structures, pendingChanges]);

  // Build Tree
  const buildTree = (parentId: string | null = null) => {
    return localStructures.filter(s => s.parentId === parentId);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('nodeId', id);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetParentId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('nodeId');
    
    if (!draggedId || draggedId === targetParentId) return;

    // Prevent circular dependency (very basic check)
    let current = targetParentId;
    while (current) {
      if (current === draggedId) {
        alert("Cannot drop a structure into its own child.");
        return;
      }
      const p = localStructures.find(s => s.id === current);
      current = p ? p.parentId : null;
    }

    const draggedNode = localStructures.find(s => s.id === draggedId);
    if (!draggedNode || draggedNode.parentId === targetParentId) return;

    // Apply locally
    setLocalStructures(prev => prev.map(s => s.id === draggedId ? { ...s, parentId: targetParentId } : s));
    setPendingChanges({ id: draggedId, parentId: targetParentId });
  };

  const handleSave = async () => {
    if (!pendingChanges) return;
    setSaving(true);
    try {
      await eimApi.updateStructureParent(pendingChanges.id, pendingChanges.parentId);
      setPendingChanges(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save structural changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalStructures(structures);
    setPendingChanges(null);
  };

  const renderTreeNode = (node: any, level: number = 0) => {
    const children = buildTree(node.id);
    return (
      <div key={node.id} className="pl-6" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, node.id)}>
        <div 
          draggable 
          onDragStart={(e) => handleDragStart(e, node.id)}
          className="flex items-center gap-3 p-3 my-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-colors cursor-grab active:cursor-grabbing group"
        >
          <GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{node.name} <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2">{node.structureType}</span></p>
            <p className="text-xs text-slate-500 mt-0.5">{node.code}</p>
          </div>
        </div>
        {children.length > 0 && (
          <div className="border-l-2 border-slate-100 ml-4">
            {children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-slate-800">Departments & Hierarchy</h3>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setView('tree')} className={`p-1.5 rounded-md flex items-center transition-colors ${view === 'tree' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <FolderTree size={16} />
            </button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-md flex items-center transition-colors ${view === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          {pendingChanges && (
            <div className="flex items-center gap-2 mr-4 bg-amber-50 text-amber-800 px-4 py-1.5 rounded-lg border border-amber-200">
              <span className="text-sm font-medium">Unsaved Changes</span>
              <button onClick={handleCancel} className="p-1 hover:bg-amber-100 rounded-md text-amber-700" title="Cancel">
                <X size={16} />
              </button>
              <button onClick={handleSave} disabled={saving} className="p-1 hover:bg-amber-100 rounded-md text-amber-700" title="Save Changes">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              </button>
            </div>
          )}
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus size={16} /> Add Structure
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden min-h-[400px]">
        {view === 'list' ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structures.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.code}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.structureType}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {structures.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No structural units found.</td></tr>}
            </tbody>
          </table>
        ) : (
          <div className="p-6 bg-slate-50/50 overflow-x-auto" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, null)}>
            <div className="text-sm text-slate-500 mb-6 flex items-center gap-2">
              <Network size={16} /> Drag and drop nodes to reorder the hierarchy. Drop here to move to root level.
            </div>
            <div className="-ml-6">
              {buildTree(null).map(rootNode => renderTreeNode(rootNode))}
            </div>
            {structures.length === 0 && <div className="py-8 text-center text-slate-500">No hierarchy defined.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
