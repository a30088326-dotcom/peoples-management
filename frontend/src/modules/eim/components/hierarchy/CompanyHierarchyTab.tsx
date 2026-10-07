import React, { useState, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { eimApi } from '../../../../lib/api/eimApi';
import { Loader2, ZoomIn, ZoomOut, Maximize, Search, Filter } from 'lucide-react';
import OrgChartNode from './OrgChartNode';
import NodeDetailsPanel from './NodeDetailsPanel';
import { AddEditNodeForm, MoveNodeForm } from './HierarchyForms';

interface Props {
  onRefreshTrigger?: number;
}

export default function CompanyHierarchyTab({ onRefreshTrigger = 0 }: Props) {
  const [structures, setStructures] = useState<any[]>([]);
  const [hierarchyConfig, setHierarchyConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [structRes, configRes] = await Promise.all([
        eimApi.getStructures(),
        eimApi.getHierarchyConfig()
      ]);
      setStructures(structRes.data.data || []);
      setHierarchyConfig(configRes.data.data || []);
      
      // Auto-expand first level by default
      if (structRes.data.data) {
        const rootNodes = structRes.data.data.filter((s: any) => !s.parentId);
        setExpandedNodes(new Set(rootNodes.map((n: any) => n.id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const structRes = await eimApi.getStructures();
      setStructures(structRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [onRefreshTrigger]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(structures.map(s => s.id)));
  };
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const rootNodes = useMemo(() => structures.filter(s => !s.parentId), [structures]);
  const getChildren = (parentId: string) => structures.filter(s => s.parentId === parentId);

  const structureTypes = useMemo(() => Array.from(new Set(structures.map(s => s.structureType).filter(Boolean))), [structures]);

  const renderTree = (node: any) => {
    const children = getChildren(node.id);
    return (
      <OrgChartNode
        key={node.id}
        node={node}
        childrenNodes={children}
        isExpanded={expandedNodes.has(node.id)}
        isSelected={selectedNodeId === node.id}
        onToggle={toggleExpand}
        onClick={(n) => setSelectedNodeId(n.id)}
        renderChild={renderTree}
      />
    );
  };

  const selectedNode = useMemo(() => structures.find(s => s.id === selectedNodeId), [selectedNodeId, structures]);

  const handleToggleStatus = async () => {
    if (!selectedNode) return;
    try {
      await eimApi.updateStructure(selectedNode.id, { ...selectedNode, isActive: !selectedNode.isActive });
      refreshData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex h-[600px] items-center justify-center bg-white rounded-xl border border-slate-200"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  }

  return (
    <div className="relative h-[calc(100vh-200px)] min-h-[600px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
        <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search units..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Types</option>
              {structureTypes.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-medium text-slate-700 hover:bg-slate-50">Expand All</button>
          <button onClick={collapseAll} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-medium text-slate-700 hover:bg-slate-50">Collapse All</button>
          <button onClick={() => { setSelectedNodeId(null); setShowAddForm(true); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow-sm text-xs font-medium hover:bg-indigo-700">Add Root Unit</button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" onClick={() => setSelectedNodeId(null)}>
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={2}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                <div className="flex flex-col bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                  <button onClick={() => zoomIn()} className="p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-b border-slate-100" title="Zoom In"><ZoomIn size={18}/></button>
                  <button onClick={() => zoomOut()} className="p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-b border-slate-100" title="Zoom Out"><ZoomOut size={18}/></button>
                  <button onClick={() => resetTransform()} className="p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600" title="Fit to Screen"><Maximize size={18}/></button>
                </div>
              </div>

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div className="min-w-max min-h-max p-20 pt-32 pb-48 flex justify-center">
                  <div className="flex gap-16 relative">
                    {rootNodes.map(node => renderTree(node))}
                    {rootNodes.length === 0 && (
                      <div className="text-slate-400 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm text-sm">
                        No hierarchy structures defined. Add a root node to begin.
                      </div>
                    )}
                  </div>
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Details Panel */}
      {selectedNode && (
        <NodeDetailsPanel 
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onEdit={() => setShowEditForm(true)}
          onMove={() => setShowMoveForm(true)}
          onAddChild={() => setShowAddForm(true)}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Forms */}
      {showAddForm && (
        <AddEditNodeForm 
          parentId={selectedNodeId || ''} 
          hierarchyConfig={hierarchyConfig}
          onClose={() => setShowAddForm(false)}
          onSuccess={() => { setShowAddForm(false); refreshData(); setExpandedNodes(prev => selectedNodeId ? new Set(prev).add(selectedNodeId) : prev); }}
        />
      )}
      {showEditForm && selectedNode && (
        <AddEditNodeForm 
          node={selectedNode}
          hierarchyConfig={hierarchyConfig}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => { setShowEditForm(false); refreshData(); }}
        />
      )}
      {showMoveForm && selectedNode && (
        <MoveNodeForm 
          node={selectedNode}
          structures={structures}
          hierarchyConfig={hierarchyConfig}
          onClose={() => setShowMoveForm(false)}
          onSuccess={() => { setShowMoveForm(false); refreshData(); }}
        />
      )}

    </div>
  );
}
