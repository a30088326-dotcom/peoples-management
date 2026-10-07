import React, { useState, useEffect } from 'react';
import { Network, Search, Maximize, ZoomIn, ZoomOut, RefreshCw, Users, ShieldCheck, ChevronRight, CornerDownRight, X, Filter, Edit2, UserX, AlertTriangle, PanelRightOpen, ToggleLeft, ToggleRight, Save, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HierarchyNode, HierarchyAuditRecord, HierarchyEmployee } from '../../../types';
import { reportingHierarchyApi } from '../../../lib/api/reportingHierarchy';
import { useAuth } from '../../../context/AuthContext';
import OrgChartNode from '../components/OrgChartNode';
import AssignManagerModal from '../components/AssignManagerModal';

export default function ReportingHierarchyHub() {
  const [activeTab, setActiveTab] = useState<'chart' | 'directory' | 'audit'>('chart');
  
  const { user, isAdmin } = useAuth();

  // Data States
  const [rootNodes, setRootNodes] = useState<HierarchyNode[]>([]);
  const [auditLogs, setAuditLogs] = useState<HierarchyAuditRecord[]>([]);
  const [levelNames, setLevelNames] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Advanced Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HierarchyEmployee[]>([]);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [filters, setFilters] = useState({ department: 'All', status: 'All' });
  const [isMyTeamView, setIsMyTeamView] = useState(false);

  // Unassigned Panel State
  const [unassignedEmployees, setUnassignedEmployees] = useState<HierarchyEmployee[]>([]);
  const [isUnassignedPanelOpen, setIsUnassignedPanelOpen] = useState(false);
  const [unassignedLoading, setUnassignedLoading] = useState(false);

  // Edit Mode / Drag-and-Drop State
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Array<{ employeeId: string; newReportingManagerId: string | null; employeeName?: string; targetName?: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const fetchRootNodes = async (overrideRootId?: string) => {
    try {
      setIsLoading(true);
      const res = await reportingHierarchyApi.getTreeNodes(overrideRootId);
      if (res.data.success) {
        setRootNodes(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hierarchy', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await reportingHierarchyApi.getAuditHistory();
      if (res.data.success) {
        setAuditLogs(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    }
  };

  const fetchUnassigned = async () => {
    setUnassignedLoading(true);
    try {
      const res = await reportingHierarchyApi.getUnassignedEmployees();
      if (res.data.success) {
        setUnassignedEmployees(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch unassigned employees', error);
    } finally {
      setUnassignedLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const res = await reportingHierarchyApi.getLevels();
      if (res.data.success) {
        setLevelNames(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch levels', error);
    }
  };

  useEffect(() => {
    fetchRootNodes();
    if (isAdmin) {
      fetchAuditLogs();
      fetchUnassigned();
    }
    fetchLevels();
    // Load departments dynamically from active employees
    reportingHierarchyApi.getActiveEmployees().then(res => {
      if (res.data.success) {
        const depts = Array.from(new Set(
          (res.data.data as HierarchyEmployee[])
            .map((e: any) => e.department)
            .filter(Boolean)
        )).sort() as string[];
        setDepartments(depts);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        reportingHierarchyApi.getActiveEmployees(searchQuery).then(res => {
          if (res.data.success) {
            setSearchResults(res.data.data);
          }
        });
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSearchResult = async (employeeId: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsLoading(true);
    try {
      const res = await reportingHierarchyApi.getUpwardPath(employeeId);
      if (res.data.success) {
        setExpandedNodes(prev => Array.from(new Set([...prev, ...res.data.data])));
        setHighlightedNodeId(employeeId);
        // Ensure root matches if they are in "My Team" view but the target isn't in it,
        // For simplicity, reset to company root to guarantee finding them
        if (isMyTeamView) {
          setIsMyTeamView(false);
          await fetchRootNodes();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMyTeamView = async () => {
    if (isMyTeamView) {
      setIsMyTeamView(false);
      fetchRootNodes();
    } else {
      try {
        const res = await reportingHierarchyApi.getMyNode();
        if (res.data.success && res.data.data) {
          setIsMyTeamView(true);
          fetchRootNodes(res.data.data);
        } else {
          setSaveError('Could not find an employee profile associated with your account.');
        }
      } catch (err) {
        console.error('Failed to get my node', err);
      }
    }
  };

  
  const handleRemoveManager = (employeeId: string) => {
    setConfirmRemoveId(employeeId);
  };

  const confirmRemoveManager = async () => {
    if (!confirmRemoveId) return;
    try {
      await reportingHierarchyApi.assignManager({
        employeeId: confirmRemoveId,
        reportingManagerId: null,
        effectiveDate: new Date().toISOString().split('T')[0],
        reason: 'Removed via Org Chart'
      } as any);
      setConfirmRemoveId(null);
      fetchRootNodes();
      fetchUnassigned();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to remove manager.');
      setConfirmRemoveId(null);
    }
  };

  const handleOpenAssignModal = (employeeId?: string) => {
    setSelectedEmployeeId(employeeId || null);
    setIsAssignModalOpen(true);
  };

  const handleManagerAssigned = () => {
    setIsAssignModalOpen(false);
    setSelectedEmployeeId(null);
    fetchRootNodes();
    fetchAuditLogs();
    fetchUnassigned(); // Also refresh unassigned list
  };

  // ── Drag-and-Drop Handlers ──
  const findNodeName = (id: string, nodes: HierarchyNode[]): string => {
    for (const n of nodes) {
      if (n.id === id) return n.name;
      if (n.children) {
        const found = findNodeName(id, n.children);
        if (found) return found;
      }
    }
    return 'Unknown';
  };

  const handleDragDrop = (draggedId: string, targetManagerId: string) => {
    // Don't add duplicate changes for the same employee
    setPendingChanges(prev => {
      const filtered = prev.filter(c => c.employeeId !== draggedId);
      return [...filtered, {
        employeeId: draggedId,
        newReportingManagerId: targetManagerId,
        employeeName: findNodeName(draggedId, rootNodes),
        targetName: findNodeName(targetManagerId, rootNodes)
      }];
    });
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setPendingChanges([]);
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.length === 0) return;
    setIsSaving(true);
    try {
      const payload = pendingChanges.map(c => ({
        employeeId: c.employeeId,
        newReportingManagerId: c.newReportingManagerId
      }));
      const today = new Date().toISOString().split('T')[0];
      const res = await reportingHierarchyApi.bulkUpdateManagers(payload, today);
      if (res.data.success) {
        setPendingChanges([]);
        setIsEditMode(false);
        fetchRootNodes();
        fetchAuditLogs();
        fetchUnassigned();
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || 'Bulk update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workspace-frame relative bg-slate-50/50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Network size={20} />
              </div>
              Organization Hierarchy
            </h1>
            <p className="text-slate-500 mt-1">{isAdmin ? 'Manage reporting lines and company structure' : 'Explore the company reporting structure'}</p>
          </div>
          
          <div className="flex items-center gap-3">
            
            {isAdmin && <button
              onClick={() => setIsUnassignedPanelOpen(prev => !prev)}
              className={`relative flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-colors shadow-sm ${
                isUnassignedPanelOpen ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserX size={18} />
              Unassigned
              {unassignedEmployees.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-orange-500 text-white rounded-full leading-none">
                  {unassignedEmployees.length}
                </span>
              )}
            </button>}
            <button 
              onClick={handleMyTeamView}
              className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-colors shadow-sm ${
                isMyTeamView ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users size={18} />
              {isMyTeamView ? 'View All Company' : 'My Team'}
            </button>
            {isAdmin && !isEditMode && (
              <button 
                onClick={() => handleOpenAssignModal()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
              >
                <Edit2 size={18} />
                Reassign Manager
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
          <div className={`flex flex-wrap items-center gap-4 mt-4 ${activeTab === 'chart' ? '' : 'invisible'}`} aria-hidden={activeTab !== 'chart'}>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search employee to locate in chart..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto z-50">
                  {searchResults.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectSearchResult(emp.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {(emp.name || (emp as any).fullName || "E").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{emp.name}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.designation}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select 
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-indigo-500"
                value={filters.department}
                onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            {(highlightedNodeId || expandedNodes.length > 0) && (
              <button 
                onClick={() => { setHighlightedNodeId(null); setExpandedNodes([]); setSearchQuery(''); }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear Highlights & Expansion"
              >
                <X size={18} />
              </button>
            )}
          </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-4 border-b border-slate-200">
          {[
            { id: 'chart', label: 'Interactive Org Chart', icon: <Network size={16} /> },
            ...(isAdmin ? [{ id: 'audit', label: 'Audit History', icon: <ShieldCheck size={16} /> }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex items-center gap-2 pb-3 font-bold transition-colors relative ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'chart' && (
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
            {isLoading && rootNodes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 gap-3">
                <RefreshCw className="animate-spin" size={24} />
                <span className="font-bold">Loading Organization Structure...</span>
              </div>
            ) : rootNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Network size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-lg text-slate-600">No active employees found.</p>
              </div>
            ) : (
              <TransformWrapper 
                initialScale={1} 
                minScale={0.1} 
                maxScale={2} 
                centerOnInit 
                limitToBounds={false}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <React.Fragment>
                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50 bg-white/80 backdrop-blur shadow-xl border border-slate-200/60 p-2 rounded-2xl">
                      <button onClick={() => zoomIn()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" title="Zoom In"><ZoomIn size={20} /></button>
                      <button onClick={() => zoomOut()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" title="Zoom Out"><ZoomOut size={20} /></button>
                      <div className="h-px bg-slate-200 mx-2" />
                      <button onClick={() => resetTransform()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" title="Fit to Screen"><Maximize size={20} /></button>
                    </div>
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="p-16">
                      <div className="flex flex-wrap gap-12 justify-center min-w-max pb-32 pt-16">
                        {rootNodes.map(node => (
                          <OrgChartNode 
                            key={node.id} 
                            node={node} 
                            onChangeManager={handleOpenAssignModal}
                            onRemoveManager={handleRemoveManager}
                            filters={filters}
                            highlightedNodeId={highlightedNodeId}
                            expandedNodes={expandedNodes}
                            isEditMode={isEditMode}
                            onDrop={handleDragDrop}
                            pendingChanges={pendingChanges}
                            depth={1}
                            levelNames={levelNames}
                            onUpdateLevelName={async (depth: number, name: string) => {
                              try {
                                const res = await reportingHierarchyApi.updateLevel(depth, name);
                                if (res.data.success) {
                                  fetchLevels();
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                          />
                        ))}
                      </div>
                    </TransformComponent>
                  </React.Fragment>
                )}
              </TransformWrapper>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="h-full overflow-auto overscroll-contain [scrollbar-gutter:stable] [overflow-anchor:none] p-4 sm:p-8">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                    <th className="px-6 py-4 font-black">Date</th>
                    <th className="px-6 py-4 font-black">Employee</th>
                    <th className="px-6 py-4 font-black">Change</th>
                    <th className="px-6 py-4 font-black">Reason</th>
                    <th className="px-6 py-4 font-black text-right">Changed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-700">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString() : (log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '—')}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Effective: {log.effective_date ? new Date(log.effective_date).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">{log.employeeName}</div>
                        <div className="text-xs text-slate-500">{log.employeeNo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400 font-medium line-through">
                              {log.previousManagerName || 'None (Top Level)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                            <CornerDownRight size={14} />
                            {log.newManagerName || 'None (Top Level)'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          {log.reason || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-slate-500 font-medium">{log.changed_by}</div>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No hierarchy changes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Unassigned Employees Slide-Out Drawer ─── */}
      <AnimatePresence>
        {isUnassignedPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <UserX size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">Unassigned Employees</h3>
                  <p className="text-xs text-slate-500">{unassignedEmployees.length} employee{unassignedEmployees.length !== 1 ? 's' : ''} without a manager</p>
                </div>
              </div>
              <button
                onClick={() => setIsUnassignedPanelOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto">
              {unassignedLoading ? (
                <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
                  <RefreshCw className="animate-spin" size={18} />
                  <span className="text-sm font-medium">Loading...</span>
                </div>
              ) : unassignedEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 px-6">
                  <ShieldCheck size={32} className="mb-3 text-emerald-400" />
                  <p className="font-bold text-sm text-slate-600">All Clear!</p>
                  <p className="text-xs text-center mt-1">Every active employee has a reporting manager assigned.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {unassignedEmployees.map(emp => (
                    <div key={emp.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 overflow-hidden">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            (emp.name || (emp as any).fullName || "E").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 truncate">{emp.name}</h4>
                          <p className="text-xs text-slate-500 truncate">{emp.designation || 'No designation'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-500 tracking-wider">
                              {emp.employeeNo || '—'}
                            </span>
                            {emp.department && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-black text-indigo-600 tracking-wider truncate">
                                {emp.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { handleOpenAssignModal(emp.id); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <Users size={14} />
                        Assign Manager
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {unassignedEmployees.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-orange-50/50">
                <div className="flex items-start gap-2 text-xs text-orange-700">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>These employees don't appear in the org chart. Assign them a reporting manager to integrate them into the hierarchy.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && isAssignModalOpen && (
        <AssignManagerModal 
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={handleManagerAssigned}
          initialEmployeeId={selectedEmployeeId || undefined}
        />
      )}

      {/* ─── Inline Error Banner ─── */}
      {saveError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl shadow-2xl max-w-lg">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="text-sm font-medium flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-white/70 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* ─── Confirm Remove Manager Dialog ─── */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Remove Manager</h3>
                <p className="text-sm text-slate-500">This employee will become unassigned.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">Are you sure you want to remove the reporting manager for this employee?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
              >Cancel</button>
              <button
                onClick={confirmRemoveManager}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors text-sm"
              >Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sticky Save/Cancel Banner (Edit Mode) ─── */}
      <AnimatePresence>
        {isEditMode && pendingChanges.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-slate-900/40 flex items-center gap-6 max-w-3xl w-full backdrop-blur"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-bold text-sm">{pendingChanges.length} unsaved change{pendingChanges.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-16 overflow-y-auto">
                {pendingChanges.map(c => (
                  <span key={c.employeeId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-lg text-[11px] text-slate-300 font-medium">
                    {c.employeeName || 'Employee'} → {c.targetName || 'Manager'}
                    <button 
                      onClick={() => setPendingChanges(prev => prev.filter(p => p.employeeId !== c.employeeId))}
                      className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleCancelEditMode}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors text-sm"
              >
                <Undo2 size={16} />
                Discard
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl transition-colors text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
