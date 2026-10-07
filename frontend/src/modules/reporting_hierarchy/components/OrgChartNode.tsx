import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Edit2, User, GripVertical , Trash2} from 'lucide-react';
import { HierarchyNode } from '../../../types';
import { reportingHierarchyApi } from '../../../lib/api/reportingHierarchy';

import { useAuth } from '../../../context/AuthContext';

interface OrgChartNodeProps {
  node: HierarchyNode;
  onChangeManager: (employeeId: string) => void;
  onRemoveManager?: (employeeId: string) => void;
  isChild?: boolean;
  filters?: { department?: string, status?: string };
  highlightedNodeId?: string | null;
  expandedNodes?: string[];
  // Drag-and-drop edit mode props
  isEditMode?: boolean;
  onDrop?: (draggedId: string, targetManagerId: string) => void;
  pendingChanges?: Array<{ employeeId: string; newReportingManagerId: string | null }>;
  depth?: number;
  levelNames?: Record<number, string>;
  onUpdateLevelName?: (depth: number, name: string) => void;
}

export default function OrgChartNode({
  node, onChangeManager,
  onRemoveManager,
  isChild = false, filters, highlightedNodeId, expandedNodes,
  isEditMode = false, onDrop, pendingChanges, depth = 1, levelNames, onUpdateLevelName
}: OrgChartNodeProps) {
  const {isAdmin}=useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(!isChild && !!node.hasChildren);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [levelInput, setLevelInput] = useState('');
  const [children, setChildren] = useState<HierarchyNode[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const isHighlighted = highlightedNodeId === node.id;
  const isFilteredOut = filters && (
    (filters.department && filters.department !== 'All' && node.department !== filters.department) ||
    (filters.status && filters.status !== 'All' && node.status !== filters.status)
  );
  const hasPendingChange = pendingChanges?.some(c => c.employeeId === node.id);

  // Sync incoming children prop
  React.useEffect(() => {
    if (node.children && node.children.length > 0) {
      setChildren(node.children);
    }
  }, [node.children]);

  // Auto-fetch direct reports for expanded nodes if not loaded yet
  React.useEffect(() => {
    if (isExpanded && node.hasChildren && children.length === 0 && !isLoading) {
      setIsLoading(true);
      reportingHierarchyApi.getTreeNodes(node.id).then(res => {
        if (res.data.success && res.data.data) {
          setChildren(res.data.data);
        }
      }).catch(err => console.error(err)).finally(() => setIsLoading(false));
    }
  }, [isExpanded, node.id, node.hasChildren, children.length]);

  React.useEffect(() => {
    if (expandedNodes?.includes(node.id) && !isExpanded) {
      if (node.hasChildren && children.length === 0) {
        setIsLoading(true);
        reportingHierarchyApi.getTreeNodes(node.id).then(res => {
          if (res.data.success) {
            setChildren(res.data.data);
            setIsExpanded(true);
          }
        }).catch(err => console.error(err)).finally(() => setIsLoading(false));
      } else {
        setIsExpanded(true);
      }
    }
  }, [expandedNodes, node.id, isExpanded, children.length, node.hasChildren]);

  const handleToggleExpand = async () => {
    if (!isExpanded && node.hasChildren && children.length === 0) {
      setIsLoading(true);
      try {
        const res = await reportingHierarchyApi.getTreeNodes(node.id);
        if (res.data.success) {
          setChildren(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load children', error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  // ── Drag & Drop Handlers ──
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add a subtle visual on the dragged element
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => el.style.opacity = '0.4', 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOver(false);
  };

  const handleDropOnNode = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== node.id && onDrop) {
      onDrop(draggedId, node.id);
    }
  };

  // Build class for the card dynamically
  let cardBorderClass = 'border-slate-200/60 hover:shadow-indigo-500/10';
  if (isHighlighted) cardBorderClass = 'border-amber-400 ring-4 ring-amber-400/20 shadow-amber-400/20';
  if (isDragOver && isEditMode) cardBorderClass = 'border-emerald-400 ring-4 ring-emerald-400/30 shadow-emerald-400/30 scale-[1.03]';
  if (hasPendingChange) cardBorderClass = 'border-blue-400 ring-2 ring-blue-400/20';

  const displayName = node?.name || (node as any)?.fullName || ((node as any)?.firstName ? ((node as any)?.firstName + ' ' + ((node as any)?.lastName || '')) : '') || 'Employee';
  const avatarLetter = (displayName ? displayName.charAt(0) : 'E').toUpperCase();

  const rankOrder=['OWNER','CEO','DIRECTOR','DEPARTMENT_HEAD','MANAGER','TEAM_LEAD','SENIOR','EMPLOYEE'];
  const rankLevel=Math.max(1,rankOrder.indexOf((node as any).organizationalRank||'EMPLOYEE')+1);
  const labels=['Owner','CEO','Director','Department Head','Manager','Assistant Manager / Team Lead','Senior','Employee'];
  // Stored hierarchy levels are zero-based while rankLevel is user-facing one-based.
  const displayedLevelName=levelNames?.[rankLevel-1]||labels[rankLevel-1];

  // Determine badge styling based on depth
  let badgeGradient = 'from-slate-500 to-slate-600';
  if (depth === 1) badgeGradient = 'from-amber-500 to-yellow-500';
  else if (depth === 2) badgeGradient = 'from-slate-700 to-slate-900';
  else if (depth === 3) badgeGradient = 'from-emerald-500 to-teal-600';

  const handleLevelSave = () => {
    if (levelInput.trim() && levelInput !== displayedLevelName && onUpdateLevelName) {
      onUpdateLevelName(rankLevel - 1, levelInput.trim());
    }
    setIsEditingLevel(false);
  };

  const levelBadge = (
    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r ${badgeGradient} text-white text-[10px] font-black tracking-widest rounded-full shadow-md whitespace-nowrap z-30 uppercase flex items-center gap-1 group/badge cursor-pointer`}
         onClick={(e) => {
           if (isEditMode || !isAdmin) return;
           e.stopPropagation();
           setIsEditingLevel(true);
           setLevelInput(displayedLevelName);
         }}
    >
      {isEditingLevel ? (
        <input 
          type="text" 
          value={levelInput}
          onChange={(e) => setLevelInput(e.target.value)}
          onBlur={handleLevelSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLevelSave();
            if (e.key === 'Escape') setIsEditingLevel(false);
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          className="bg-white/20 text-white outline-none border-b border-white/50 px-1 w-32 text-center placeholder-white/50"
        />
      ) : (
        <>
          <span>Level {rankLevel} • {displayedLevelName}</span>
          {!isEditMode && isAdmin && onUpdateLevelName && (
            <Edit2 size={10} className="opacity-0 group-hover/badge:opacity-100 transition-opacity ml-1 hover:scale-110" />
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col items-center ${isChild ? 'mt-8 relative' : ''}`}>
      {/* Connector Line from Parent */}
      {isChild && (
        <div className="absolute -top-8 left-1/2 w-px h-8 bg-slate-300 -translate-x-1/2" />
      )}

      {/* Node Card — wrapper div handles native DnD, inner motion.div handles animation */}
      <div
        draggable={isEditMode}
        onDragStart={isEditMode ? handleDragStart : undefined}
        onDragEnd={isEditMode ? handleDragEnd : undefined}
        onDragOver={isEditMode ? handleDragOver : undefined}
        onDragLeave={isEditMode ? handleDragLeave : undefined}
        onDrop={isEditMode ? handleDropOnNode : undefined}
      >
        <motion.div 
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative group bg-white/80 backdrop-blur-xl border p-4 rounded-2xl shadow-sm hover:shadow-xl transition-all w-72 z-10 ${cardBorderClass} ${isFilteredOut ? 'opacity-30 grayscale' : 'opacity-100'} ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          {/* Edit mode grip indicator */}
          {isEditMode && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={14} />
            </div>
          )}

          {/* Pending change badge */}
          {hasPendingChange && (
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full z-20 shadow-sm">
              MOVED
            </div>
          )}

          {levelBadge}

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-inner overflow-hidden shrink-0">
              {node.avatar ? (
                <img src={node.avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                avatarLetter
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-sm truncate">{displayName}</h3>
              <p className="text-xs font-bold text-slate-500 truncate">{node?.designation || "Staff"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-500 tracking-wider">
                  {node?.employeeNo || "—"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-black text-indigo-600 tracking-wider truncate">
                  {node?.department || "General"}
                </span>
              </div>
            </div>
          </div>

          {/* Direct edit action for every level, including CEO / GM / department heads. */}
          {!isEditMode && isAdmin && (
            <div className="absolute top-2 right-2 flex items-center gap-1">
              
              <button 
                disabled={!isAdmin} onClick={() => onChangeManager(node.id)}
                className="p-1.5 bg-white text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg shadow-sm border border-indigo-100 transition-colors"
                title="Edit reporting line"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => onRemoveManager && onRemoveManager(node.id)}
                className="p-1.5 bg-white text-slate-300 hover:text-red-600 rounded-lg shadow-sm border border-slate-100 transition-colors"
                title="Remove Manager"
              >
                <Trash2 size={14} />
              </button>

            </div>
          )}

          {/* Bottom Expand Bar */}
          {node.hasChildren && (
            <button 
              onClick={handleToggleExpand}
              className="mt-4 w-full flex items-center justify-center gap-2 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Users size={14} />
              {(node?.directReportsCount || 0)} Reports
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin ml-1" />
              ) : isExpanded ? (
                <ChevronUp size={14} className="ml-1" />
              ) : (
                <ChevronDown size={14} className="ml-1" />
              )}
            </button>
          )}
        </motion.div>
      </div>

      {/* Children Container */}
      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative flex gap-6 pt-8 mt-2"
          >
            {/* Horizontal Connector Line for Children */}
            {children.length > 1 && (
              <div className="absolute top-0 left-[calc(50%/2)] right-[calc(50%/2)] h-px bg-slate-300" 
                   style={{ left: `calc(50% - ${(children.length - 1) * 144}px)`, right: `calc(50% - ${(children.length - 1) * 144}px)` }} 
              />
            )}
            
            {/* Vertical drop from parent to horizontal line */}
            <div className="absolute top-[-8px] left-1/2 w-px h-[9px] bg-slate-300 -translate-x-1/2" />

            {children.map((child, index) => (
              <OrgChartNode 
                key={child.id} 
                node={child} 
                onChangeManager={onChangeManager}
                onRemoveManager={onRemoveManager}
                isChild={true}
                filters={filters}
                highlightedNodeId={highlightedNodeId}
                expandedNodes={expandedNodes}
                isEditMode={isEditMode}
                onDrop={onDrop}
                pendingChanges={pendingChanges}
                depth={depth + 1}
                levelNames={levelNames}
                onUpdateLevelName={onUpdateLevelName}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
