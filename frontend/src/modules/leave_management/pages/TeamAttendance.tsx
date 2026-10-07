import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ChevronLeft, ChevronRight, Clock, Calendar,
  CheckCircle2, XCircle, AlertCircle, Coffee, Loader2,
  TrendingUp, UserCheck, AlertTriangle, CalendarDays, Inbox,
  Check, X
} from 'lucide-react';
import { api } from '../../../lib/api';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

interface Employee {
  id: string;
  employeeNo: string;
  employeeName: string;
}

interface DayRecord {
  inTime: string | null;
  outTime: string | null;
  totalHours: string | null;
  status: string;
  isLate: boolean;
}

interface LeaveEntry {
  startDate: string;
  endDate: string;
  leaveType: string;
  colorCode: string;
}

interface TeamMonthlyData {
  employees: Employee[];
  attendance: Record<string, Record<string, DayRecord>>;
  leaves: Record<string, LeaveEntry[]>;
}

interface ExceptionRequest {
  id: string;
  employeeId: string;
  date: string;
  exceptionType: string;
  status: string;
  reason: string;
  requestedValue: string;
  resolutionNotes?: string;
  createdAt: string;
  employeeName: string;
  employeeNo: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmtTime = (dt: string | null) => {
  if (!dt) return '--';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtHours = (h: string | null) => {
  if (!h) return '--';
  const n = parseFloat(h);
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  return `${hrs}h ${mins > 0 ? mins + 'm' : ''}`.trim();
};

const isDateOnLeave = (dateStr: string, leaves: LeaveEntry[]): LeaveEntry | null => {
  if (!leaves) return null;
  const date = new Date(dateStr);
  for (const leave of leaves) {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    if (date >= start && date <= end) return leave;
  }
  return null;
};

export default function TeamAttendance() {
  const [rejectId,setRejectId]=useState<string|null>(null),[rejectReason,setRejectReason]=useState(''),[decisionError,setDecisionError]=useState('');
  const now = new Date();
  const requestedPeriod = () => { const params = new URLSearchParams(window.location.search); const y = Number(params.get('year')); const m = Number(params.get('month')); return { year: y >= 2000 && y <= 2100 ? y : now.getFullYear(), month: m >= 1 && m <= 12 ? m : now.getMonth() + 1 }; };
  const [year, setYear] = useState(requestedPeriod().year);
  const [month, setMonth] = useState(requestedPeriod().month);
  useEffect(() => { const handler = () => { const p = requestedPeriod(); setYear(p.year); setMonth(p.month); }; window.addEventListener('popstate', handler); return () => window.removeEventListener('popstate', handler); }, []);
  const [data, setData] = useState<TeamMonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'requests'>('calendar');
  const [exceptions, setExceptions] = useState<ExceptionRequest[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/attendance/team-monthly', { params: { year, month } });
      if (res.data.success) {
        setData(res.data.data);
        if (res.data.data.employees.length > 0 && !selectedEmployee) {
          setSelectedEmployee(res.data.data.employees[0].id);
        }
      } else {
        setError('Failed to load team attendance.');
      }

      // Fetch pending exceptions
      const excRes = await api.get('/api/attendance/team-exceptions');
      if (excRes.data.success) {
        setExceptions(excRes.data.data);
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team attendance.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build days array for the selected month
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  };

  const getStatusStyle = (rec: DayRecord | undefined, onLeave: LeaveEntry | null, isWknd: boolean) => {
    if (isWknd) return { dot: 'bg-slate-200', bg: 'bg-slate-50', text: 'text-slate-300' };
    if (onLeave) return { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' };
    if (!rec) return { dot: 'bg-rose-200', bg: 'bg-rose-50', text: 'text-rose-400' };
    const s = rec.status?.toUpperCase();
    if (s === 'APPROVED' || s === 'PRESENT') {
      return rec.isLate
        ? { dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700' }
        : { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' };
    }
    if (s === 'ABSENT') return { dot: 'bg-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' };
    return { dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' };
  };

  // Compute summary stats for selected employee
  const computeStats = (empId: string) => {
    if (!data) return { present: 0, late: 0, absent: 0, onLeave: 0, totalHours: 0 };
    const attMap = data.attendance[empId] || {};
    const empLeaves = data.leaves[empId] || [];
    let present = 0, late = 0, absent = 0, onLeave = 0, totalHours = 0;
    for (const dateStr of days) {
      if (isWeekend(dateStr)) continue;
      const lv = isDateOnLeave(dateStr, empLeaves);
      if (lv) { onLeave++; continue; }
      const rec = attMap[dateStr];
      if (rec) {
        present++;
        if (rec.isLate) late++;
        totalHours += parseFloat(rec.totalHours || '0');
      } else {
        const today = new Date();
        const dayDate = new Date(dateStr);
        if (dayDate < today) absent++;
      }
    }
    return { present, late, absent, onLeave, totalHours };
  };

  const handleResolve = async (id: string, status: 'APPROVED' | 'REJECTED', resolutionNotes = '') => {
    try {
      setResolving(id);
      await api.post(`/api/attendance/exceptions/${id}/resolve`, { status, resolutionNotes });
      setRejectId(null);setDecisionError('');
      await fetchData(); // Refresh all data
    } catch (err: any) {
      setDecisionError(err.response?.data?.message || 'Failed to resolve request');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-slate-500">Loading team attendance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 max-w-md text-center shadow-sm">
          <AlertTriangle size={36} className="mx-auto mb-3 text-rose-400" />
          <p className="text-slate-600 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.employees.length === 0) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Team Members Found</h3>
          <p className="text-slate-500 text-sm">You have no direct reports assigned to you yet.</p>
        </div>
      </div>
    );
  }

  const selEmp = selectedEmployee
    ? data.employees.find(e => e.id === selectedEmployee)
    : data.employees[0];
  const stats = selEmp ? computeStats(selEmp.id) : null;
  const selAttMap = selectedEmployee ? (data.attendance[selectedEmployee] || {}) : {};
  const selLeaves = selectedEmployee ? (data.leaves[selectedEmployee] || []) : [];

  return (
    <div className="workspace-frame p-4 sm:p-6 gap-6">

      {/* Header */}
      <div className="shrink-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center ring-1 ring-white/20">
              <CalendarDays size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Team Attendance</h1>
              <p className="text-slate-400 text-sm mt-0.5">{data.employees.length} direct report{data.employees.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-2 py-1.5">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm min-w-[130px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 px-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'calendar' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Calendar size={16} /> Team Calendar
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Inbox size={16} /> Pending Requests
          {exceptions.filter(e => e.status === 'PENDING').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{exceptions.filter(e => e.status === 'PENDING').length}</span>
          )}
        </button>
      </div>

      <WorkspaceScrollArea resetKey={activeTab} label="Team attendance tab content">
      {activeTab === 'calendar' ? (
      <div className="flex gap-5 flex-col lg:flex-row">

        {/* Left — Employee List */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Members</p>
            </div>
            <div className="divide-y divide-slate-100">
              {data.employees.map(emp => {
                const s = computeStats(emp.id);
                const isSelected = selectedEmployee === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {emp.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{emp.employeeName}</p>
                        <p className="text-xs text-slate-400">{emp.employeeNo}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 pl-11">
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{s.present}P</span>
                      {s.late > 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">{s.late}L</span>}
                      {s.absent > 0 && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">{s.absent}A</span>}
                      {s.onLeave > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{s.onLeave}LV</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — Attendance Detail */}
        <div className="flex-1 space-y-5">

          {/* Stats Bar */}
          {stats && selEmp && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: <UserCheck size={18} className="text-emerald-600" />, label: 'Present', value: stats.present, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                { icon: <AlertCircle size={18} className="text-orange-500" />, label: 'Late Arrivals', value: stats.late, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                { icon: <XCircle size={18} className="text-rose-500" />, label: 'Absent', value: stats.absent, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
                { icon: <Coffee size={18} className="text-amber-500" />, label: 'On Leave', value: stats.onLeave, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-3`}>
                  {s.icon}
                  <div>
                    <p className={`text-2xl font-black ${s.text}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              { dot: 'bg-emerald-400', label: 'Present' },
              { dot: 'bg-orange-400', label: 'Late' },
              { dot: 'bg-rose-300', label: 'Absent' },
              { dot: 'bg-amber-400', label: 'On Leave' },
              { dot: 'bg-slate-200', label: 'Weekend' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`}></span>
                {l.label}
              </span>
            ))}
          </div>

          {/* Daily Calendar Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{selEmp?.employeeName}</p>
                <p className="text-xs text-slate-400">{selEmp?.employeeNo} · {MONTHS[month - 1]} {year}</p>
              </div>
              {stats && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{fmtHours(stats.totalHours.toFixed(2))} total</span>
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {days.map(dateStr => {
                  const isWknd = isWeekend(dateStr);
                  const rec = selAttMap[dateStr];
                  const onLeave = isDateOnLeave(dateStr, selLeaves);
                  const style = getStatusStyle(rec, onLeave, isWknd);
                  const dayNum = parseInt(dateStr.split('-')[2]);
                  const dayLabel = getDayLabel(dateStr);

                  return (
                    <div
                      key={dateStr}
                      className={`${style.bg} rounded-xl p-3 border border-transparent hover:border-slate-200 transition-all`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`}></span>
                          <span className="text-xs font-bold text-slate-600">{String(dayNum).padStart(2, '0')}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{dayLabel}</span>
                        </div>
                      </div>

                      {/* Content */}
                      {isWknd ? (
                        <p className="text-[10px] text-slate-300 font-medium">Weekend</p>
                      ) : onLeave ? (
                        <div>
                          <p className="text-[10px] font-bold text-amber-700 truncate">{onLeave.leaveType}</p>
                          <p className="text-[10px] text-amber-500">On Leave</p>
                        </div>
                      ) : rec ? (
                        <div className="space-y-0.5">
                          <p className={`text-[10px] font-bold ${style.text} truncate`}>
                            {rec.isLate ? '⚠ Late' : '✓ Present'}
                          </p>
                          <p className="text-[10px] text-slate-500">{fmtTime(rec.inTime)} – {fmtTime(rec.outTime)}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{fmtHours(rec.totalHours)}</p>
                        </div>
                      ) : (
                        <div>
                          {new Date(dateStr) < new Date(new Date().toDateString()) ? (
                            <p className="text-[10px] font-bold text-rose-500">Absent</p>
                          ) : (
                            <p className="text-[10px] text-slate-300">-</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Missed Attendance Requests</h3>
              <p className="text-xs text-slate-500 mt-1">Review and approve or reject missed punches from your team.</p>
            </div>
            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-600 border border-slate-200 shadow-sm">{exceptions.filter(e => e.status === 'PENDING').length} pending</span>
          </div>
          
          {exceptions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400" />
              <p className="font-medium text-slate-700">All caught up!</p>
              <p className="text-sm">No requests to review.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {exceptions.map(exc => {
                const reqVal = JSON.parse(exc.requestedValue || '{}');
                return (
                  <div key={exc.id} className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${exc.status === 'PENDING' ? 'hover:bg-slate-50/50' : 'bg-slate-50/30'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${exc.status === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {exc.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                          {exc.employeeName}
                          {exc.status !== 'PENDING' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${exc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {exc.status}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{exc.employeeNo}</p>
                        
                        <div className={`mt-2 border rounded-lg p-3 shadow-sm max-w-md ${exc.status === 'PENDING' ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Missed Punch</span>
                            <span className="text-xs text-slate-500">{new Date(exc.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 mb-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">In Time</span>
                              <span className="font-mono text-sm text-slate-700">{reqVal.inTime ? new Date(`2000-01-01T${reqVal.inTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                            </div>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Out Time</span>
                              <span className="font-mono text-sm text-slate-700">{reqVal.outTime ? new Date(`2000-01-01T${reqVal.outTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                            </div>
                          </div>
                          
                          {exc.reason && (
                            <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100 italic text-left">"{exc.reason}"</p>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-left">Requested on {new Date(exc.createdAt).toLocaleString()}</p>
                        {exc.status === 'REJECTED' && exc.resolutionNotes && (
                          <p className="text-xs text-rose-600 mt-1 font-medium text-left">Reason: {exc.resolutionNotes}</p>
                        )}
                      </div>
                    </div>
                    
                    {exc.status === 'PENDING' && (
                      <div className="flex gap-2 self-start md:self-center ml-14 md:ml-0">
                        <button 
                          onClick={() => {setRejectId(exc.id);setRejectReason('');setDecisionError('');}}
                          disabled={resolving === exc.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                        >
                          <X size={16} /> Reject
                        </button>
                        <button 
                          onClick={() => handleResolve(exc.id, 'APPROVED')}
                          disabled={resolving === exc.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                        >
                          {resolving === exc.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </WorkspaceScrollArea>
      {decisionError&&!rejectId&&<p role="alert" className="text-red-700 p-4">{decisionError}</p>}
      {rejectId&&<div className="fixed inset-0 z-[250] bg-slate-900/50 flex items-center justify-center p-4"><form role="dialog" aria-modal="true" aria-label="Reject attendance request" className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4" onSubmit={e=>{e.preventDefault();if(rejectReason.trim())handleResolve(rejectId,'REJECTED',rejectReason.trim());}}><h2 className="text-xl font-bold">Reject attendance request</h2><label className="block">Rejection reason<textarea className="w-full border rounded-xl p-3 mt-2" required maxLength={2000} value={rejectReason} onChange={e=>setRejectReason(e.target.value)}/></label>{decisionError&&<p role="alert" className="text-red-700">{decisionError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={!!resolving} onClick={()=>setRejectId(null)}>Cancel</button><button className="btn-primary" disabled={!!resolving||!rejectReason.trim()}>Reject request</button></div></form></div>}
    </div>
  );
}
