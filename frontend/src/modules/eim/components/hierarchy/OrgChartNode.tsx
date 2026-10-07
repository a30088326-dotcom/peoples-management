import React from 'react';
import { Building2, Network, Building, Folders, FolderTree, Users, ChevronDown, ChevronRight, User } from 'lucide-react';

interface OrgChartNodeProps {
  node: any;
  childrenNodes: any[];
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onClick: (node: any) => void;
  renderChild: (child: any) => React.ReactNode;
}

export default function OrgChartNode({ node, childrenNodes, isExpanded, isSelected, onToggle, onClick, renderChild }: OrgChartNodeProps) {
  const hasChildren = childrenNodes.length > 0;

  const getTypeStyles = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'GROUP': return 'bg-slate-800 text-white border-slate-900';
      case 'COMPANY': return 'bg-indigo-600 text-white border-indigo-700';
      case 'DIVISION': return 'bg-purple-600 text-white border-purple-700';
      case 'DEPARTMENT': return 'bg-blue-600 text-white border-blue-700';
      case 'SECTION': return 'bg-teal-600 text-white border-teal-700';
      case 'TEAM': return 'bg-emerald-600 text-white border-emerald-700';
      default: return 'bg-gray-600 text-white border-gray-700';
    }
  };

  const getIcon = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'GROUP': return <Building2 size={16} />;
      case 'COMPANY': return <Building size={16} />;
      case 'DIVISION': return <Network size={16} />;
      case 'DEPARTMENT': return <Folders size={16} />;
      case 'SECTION': return <FolderTree size={16} />;
      case 'TEAM': return <Users size={16} />;
      default: return <Building2 size={16} />;
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div 
        onClick={(e) => { e.stopPropagation(); onClick(node); }}
        className={`relative z-10 w-64 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md bg-white ${
          isSelected ? 'ring-4 ring-indigo-200 border-indigo-500 scale-[1.02]' : 'border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`p-3 rounded-t-lg flex items-center justify-between ${getTypeStyles(node.structureType)}`}>
          <div className="flex items-center gap-2 font-medium text-sm truncate">
            {getIcon(node.structureType)}
            <span className="truncate" title={node.structureType}>{node.structureType || 'Unknown'}</span>
          </div>
          <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded-full" title="Unit Code">
            {node.code}
          </span>
        </div>
        
        {/* Body */}
        <div className="p-4 flex flex-col gap-2">
          <div className="font-bold text-slate-800 text-[15px] leading-snug line-clamp-2" title={node.name}>
            {node.name}
          </div>
          
          {/* Status & Head */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1"><User size={12}/> Head:</span>
              <span className="font-medium text-slate-700 truncate max-w-[100px]" title={node.headPositionId || 'N/A'}>
                {node.headPositionId || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions (Expand/Collapse) */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
              className="bg-white border border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 rounded-full p-1 shadow-sm transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="flex justify-center pt-8 relative mt-1">
          {/* Vertical Line dropping from parent */}
          <div className="absolute top-0 left-1/2 w-px h-8 bg-slate-300 -translate-x-1/2"></div>
          
          <div className="flex justify-center">
            {childrenNodes.map((child: any, index: number) => {
              const isFirst = index === 0;
              const isLast = index === childrenNodes.length - 1;
              const isOnly = childrenNodes.length === 1;

              return (
                <div key={child.id} className="relative pt-8 px-4 flex flex-col items-center">
                  {/* Horizontal Line connecting children */}
                  {!isOnly && (
                    <div 
                      className="absolute top-0 h-px bg-slate-300" 
                      style={{
                        left: isFirst ? '50%' : '0',
                        right: isLast ? '50%' : '0'
                      }}
                    ></div>
                  )}

                  {/* Vertical Line dropping down to this child */}
                  <div className="absolute top-0 left-1/2 w-px h-8 bg-slate-300 -translate-x-1/2"></div>
                  
                  {renderChild(child)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
