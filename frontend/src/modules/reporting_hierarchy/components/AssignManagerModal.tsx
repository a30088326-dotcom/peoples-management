import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, AlertCircle, Calendar } from 'lucide-react';
import { reportingHierarchyApi } from '../../../lib/api/reportingHierarchy';
import { HierarchyEmployee } from '../../../types';

interface AssignManagerModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialEmployeeId?: string;
}

export default function AssignManagerModal({ onClose, onSuccess, initialEmployeeId }: AssignManagerModalProps) {
  const [employees, setEmployees] = useState<HierarchyEmployee[]>([]);
  const [managers, setManagers] = useState<HierarchyEmployee[]>([]);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || '');
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  
  const [searchEmp, setSearchEmp] = useState('');
  const [searchMgr, setSearchMgr] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch all active employees
    reportingHierarchyApi.getActiveEmployees().then(res => {
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      // Fetch valid managers (exclude self)
      reportingHierarchyApi.getActiveEmployees(undefined, selectedEmployeeId).then(res => {
        if (res.data.success) {
          setManagers(res.data.data);
        }
      });
      // Find current manager ID to preselect or show
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp && emp.reportingManagerId) {
        setSelectedManagerId(emp.reportingManagerId);
      } else {
        setSelectedManagerId(null);
      }
    } else {
      setManagers([]);
    }
  }, [selectedEmployeeId, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await reportingHierarchyApi.assignManager({
        employeeId: selectedEmployeeId,
        reportingManagerId: selectedManagerId,
        managerId: selectedManagerId,
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
        effectiveStartDate: effectiveDate || new Date().toISOString().split('T')[0],
        reason
      } as any);
      
      if (res.data.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred while assigning the manager.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchEmp.toLowerCase()) || 
    (e.employeeNo || '').toLowerCase().includes(searchEmp.toLowerCase())
  ).slice(0, 5);

  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(searchMgr.toLowerCase()) || 
    (m.employeeNo || '').toLowerCase().includes(searchMgr.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Assign Reporting Manager</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Update organizational reporting lines</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-600">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form id="assign-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Step 1: Employee */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">1. Select Employee</label>
              {!initialEmployeeId && !selectedEmployeeId && (
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search employee by name or number..." 
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  {searchEmp && (
                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                      {filteredEmployees.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => { setSelectedEmployeeId(emp.id); setSearchEmp(''); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {emp.avatar ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" /> : (emp.name || (emp as any).fullName || "E").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{emp.name}</div>
                            <div className="text-xs text-slate-500 truncate">{emp.designation} &bull; {emp.employeeNo}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedEmployeeId && (
                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md overflow-hidden shrink-0">
                      {employees.find(e => e.id === selectedEmployeeId)?.avatar ? 
                        <img src={employees.find(e => e.id === selectedEmployeeId)?.avatar!} alt="" className="w-full h-full object-cover" /> : 
                        ((employees.find(e => e.id === selectedEmployeeId)?.name || (employees.find(e => e.id === selectedEmployeeId) as any)?.fullName || "E")).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{employees.find(e => e.id === selectedEmployeeId)?.name}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">
                        {employees.find(e => e.id === selectedEmployeeId)?.designation} &bull; {employees.find(e => e.id === selectedEmployeeId)?.department}
                      </div>
                    </div>
                  </div>
                  {!initialEmployeeId && (
                    <button type="button" onClick={() => setSelectedEmployeeId('')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Change</button>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Manager */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">2. Assign New Manager</label>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="mgrType" 
                    checked={selectedManagerId !== null} 
                    onChange={() => setSelectedManagerId('')}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">Specific Manager</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="mgrType" 
                    checked={selectedManagerId === null} 
                    onChange={() => setSelectedManagerId(null)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">None (Top Level Executive)</span>
                </label>
              </div>

              {selectedManagerId !== null && (
                <div className="relative">
                  {selectedManagerId === '' ? (
                    <>
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search manager by name or number..." 
                        value={searchMgr}
                        onChange={(e) => setSearchMgr(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        disabled={!selectedEmployeeId}
                      />
                      {searchMgr && selectedEmployeeId && (
                        <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                          {filteredManagers.map(mgr => (
                            <button
                              key={mgr.id}
                              type="button"
                              onClick={() => { setSelectedManagerId(mgr.id); setSearchMgr(''); }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {mgr.avatar ? <img src={mgr.avatar} alt="" className="w-full h-full object-cover" /> : (mgr.name || (mgr as any).fullName || "M").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 truncate">{mgr.name}</div>
                                <div className="text-xs text-slate-500 truncate">{mgr.designation} &bull; {mgr.department}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md overflow-hidden shrink-0">
                          {employees.find(e => e.id === selectedManagerId)?.avatar ? 
                            <img src={employees.find(e => e.id === selectedManagerId)?.avatar!} alt="" className="w-full h-full object-cover" /> : 
                            ((employees.find(e => e.id === selectedManagerId)?.name || (employees.find(e => e.id === selectedManagerId) as any)?.fullName || "M")).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{employees.find(e => e.id === selectedManagerId)?.name}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">
                            {employees.find(e => e.id === selectedManagerId)?.designation}
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedManagerId('')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Change</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Effective From *</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    required
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Reason for Change</label>
                <input 
                  type="text" 
                  placeholder="e.g., Promotion, Team Restructure..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

          </form>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="assign-form"
            disabled={isSubmitting || !selectedEmployeeId || selectedManagerId === ''}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-600/20 flex items-center gap-2"
          >
            {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Confirm Assignment
          </button>
        </div>
      </motion.div>
    </div>
  );
}
