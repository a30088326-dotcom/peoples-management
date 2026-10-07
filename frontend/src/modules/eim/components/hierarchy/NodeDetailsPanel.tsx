import React from 'react';
import { X, Edit, MoveRight, Users, EyeOff, Eye, Network, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface NodeDetailsPanelProps {
  node: any;
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onAddChild: () => void;
  onToggleStatus: () => void;
}

export default function NodeDetailsPanel({ node, onClose, onEdit, onMove, onAddChild, onToggleStatus }: NodeDetailsPanelProps) {
  if (!node) return null;

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl absolute right-0 top-0 z-50">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800">Unit Details</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Main Info */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">{node.structureType}</div>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{node.name}</h2>
          <div className="text-sm text-slate-500 font-medium">Code: {node.code}</div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${node.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}">
            {node.isActive ? <CheckCircle2 size={14}/> : <EyeOff size={14}/>}
            {node.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 font-semibold mb-1">Description</div>
            <div className="text-slate-700 whitespace-pre-wrap">{node.description || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold mb-1">Unit Head</div>
            <div className="text-slate-700 font-medium">{node.headPositionId || 'Not Assigned'}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 font-semibold mb-1">Start Date</div>
              <div className="text-slate-700">{node.effectiveStartDate ? format(new Date(node.effectiveStartDate), 'MMM dd, yyyy') : '-'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold mb-1">End Date</div>
              <div className="text-slate-700">{node.effectiveEndDate ? format(new Date(node.effectiveEndDate), 'MMM dd, yyyy') : '-'}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <button onClick={onAddChild} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
          <Network size={16} /> Add Child Unit
        </button>
        <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
          <Edit size={16} /> Edit Unit
        </button>
        <button onClick={onMove} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
          <MoveRight size={16} /> Move Unit
        </button>
        <button onClick={onToggleStatus} className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors ${node.isActive ? 'text-amber-600' : 'text-emerald-600'}`}>
          {node.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
          {node.isActive ? 'Deactivate Unit' : 'Activate Unit'}
        </button>
      </div>
    </div>
  );
}
