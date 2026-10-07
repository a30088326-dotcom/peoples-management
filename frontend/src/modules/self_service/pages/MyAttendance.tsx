import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Coffee, CheckCircle2, AlertCircle, CalendarPlus, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';
import { formatHoursToHoursMinutes } from '../../../lib/formatters';

export default function MyAttendance() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualInTime, setManualInTime] = useState('09:00');
  const [manualOutTime, setManualOutTime] = useState('17:30');
  const [manualReason, setManualReason] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const [errorSource, setErrorSource] = useState<'punch' | 'manual'>('punch');
  const [editingAttendance, setEditingAttendance] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [myExceptions, setMyExceptions] = useState<any[]>([]);
  const [manualCalendarDate, setManualCalendarDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchTodayLogs();
    attendanceApi.getAttendanceHistory().then(res => {
      if (res.data?.success) setAttendanceHistory(res.data.data);
    }).catch(console.error);
    fetchExceptions();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshApprovedCorrections = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const [history, exceptions] = await Promise.all([
          attendanceApi.getAttendanceHistory(),
          attendanceApi.getMyExceptions()
        ]);
        if (history.data?.success) setAttendanceHistory(history.data.data);
        if (exceptions.data?.success) setMyExceptions(exceptions.data.data);
      } catch (err) {
        console.error('Failed to refresh attendance', err);
      }
    };
    window.addEventListener('focus', refreshApprovedCorrections);
    document.addEventListener('visibilitychange', refreshApprovedCorrections);
    return () => {
      window.removeEventListener('focus', refreshApprovedCorrections);
      document.removeEventListener('visibilitychange', refreshApprovedCorrections);
    };
  }, []);

  const fetchExceptions = async () => {
    try {
      const res = await attendanceApi.getMyExceptions();
      if (res.data?.success) setMyExceptions(res.data.data);
    } catch (err) {
      console.error('Error fetching exceptions', err);
    }
  };

  const fetchTodayLogs = async () => {
    try {
      setLoading(true);
      const res = await attendanceApi.getTodayAttendance();
      if (res.data?.success) {
        setLogs(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async (logType: 'In' | 'Out' | 'BreakIn' | 'BreakOut') => {
    try {
      setPunching(true);
      setError(null);
      setErrorSource('punch');
      await attendanceApi.punch({ logType });
      await fetchTodayLogs();
      const res = await attendanceApi.getAttendanceHistory();
      if (res.data?.success) setAttendanceHistory(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record punch. Please check that the backend server is running.');
    } finally {
      setPunching(false);
    }
  };

  const handleManualAttendance = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setManualSaving(true);
      setError(null);
      setErrorSource('manual');
      await attendanceApi.requestMissedAttendance({ date: manualDate, inTime: manualInTime, outTime: manualOutTime, reason: manualReason, recordId: editingAttendance?.id });
      setShowManualForm(false);
      setEditingAttendance(null);
      setManualDate('');
      setManualInTime('09:00');
      setManualOutTime('17:30');
      setManualReason('');
      
      setRequestMessage(editingAttendance
        ? 'Attendance correction sent to your reporting manager. The updated times will appear after approval.'
        : 'Missed attendance request sent to your reporting manager. It will appear after approval.');
      const historyRes = await attendanceApi.getAttendanceHistory();
      if (historyRes.data?.success) setAttendanceHistory(historyRes.data.data);
      await fetchExceptions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit missed attendance request');
    } finally {
      setManualSaving(false);
    }
  };

  const openAttendanceEditor = (record: any) => {
    const dateStr = String(record.date).slice(0, 10);
    setEditingAttendance(record);
    setManualDate(dateStr);
    setManualInTime(record.inTime ? new Date(record.inTime).toTimeString().slice(0, 5) : '09:00');
    setManualOutTime(record.outTime ? new Date(record.outTime).toTimeString().slice(0, 5) : '17:30');
    setManualReason('');
    setManualCalendarDate(new Date(`${dateStr}T12:00:00`));
    setRequestMessage(null);
    setShowManualForm(true);
  };

  const lastPunch = logs.length > 0 ? logs[logs.length - 1] : null;
  
  // Determine if clocked in (last punch is In or BreakOut)
  const isClockedIn = lastPunch && ['In', 'BreakOut'].includes(lastPunch.logType);
  const isBreak = lastPunch && lastPunch.logType === 'BreakIn';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const toDateKey = (value: string | Date) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const todayKey = toDateKey(new Date());
  const historyByDate = new Map(attendanceHistory.map(record => [toDateKey(record.date), record]));
  const exceptionsByDate = new Map(myExceptions.map(exc => [toDateKey(exc.date), exc]));
  const calendarDays = new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth() + 1, 0).getDate();
  const calendarOffset = new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth(), 1).getDay();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Attendance</h2>
          <p className="text-slate-500 mt-1">Record your daily attendance punches here.</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Current Time</div>
          <div className="text-3xl font-mono font-bold text-blue-600 tracking-tight">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start">
          <AlertCircle className="text-red-500 w-5 h-5 mr-3 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">{errorSource === 'manual' ? 'Manual Attendance Failed' : 'Punch Failed'}</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Actions Panel */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${isClockedIn ? 'bg-green-100 text-green-600' : isBreak ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <Clock size={40} className={isClockedIn || isBreak ? 'animate-pulse' : ''} />
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {isClockedIn ? 'You are Clocked In' : isBreak ? 'You are on Break' : 'You are Clocked Out'}
          </h3>
          <p className="text-slate-500 text-sm mb-8">
            {lastPunch ? `Last punch: ${formatTime(new Date(lastPunch.timestamp))}` : 'No punches today yet.'}
          </p>

          <div className="w-full space-y-3">
            {!isClockedIn && !isBreak && (
              <button 
                onClick={() => handlePunch('In')}
                disabled={punching}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <LogIn size={18} className="mr-2" />
                Clock In
              </button>
            )}

            {isClockedIn && (
              <>
                <button 
                  onClick={() => handlePunch('BreakIn')}
                  disabled={punching}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-3 rounded-xl border border-amber-200 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Coffee size={18} className="mr-2" />
                  Start Break
                </button>
                <button 
                  onClick={() => handlePunch('Out')}
                  disabled={punching}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <LogOut size={18} className="mr-2" />
                  Clock Out
                </button>
              </>
            )}

            {isBreak && (
              <button 
                onClick={() => handlePunch('BreakOut')}
                disabled={punching}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={18} className="mr-2" />
                End Break
              </button>
            )}

            <button
              type="button"
              onClick={() => { setEditingAttendance(null); setManualDate(''); setManualReason(''); setShowManualForm(true); }}
              className="w-full bg-white hover:bg-indigo-50 text-indigo-700 font-medium py-3 rounded-xl border border-indigo-200 transition-all flex items-center justify-center"
            >
              <CalendarPlus size={18} className="mr-2" />
              Mark Missed Attendance
            </button>
          </div>
        </div>

        {/* Monthly Calendar Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Clock size={18} className="mr-2 text-blue-500" />
              Attendance Calendar
            </h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setManualCalendarDate(new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth() - 1, 1))} className="p-1 text-slate-500 hover:bg-slate-100 rounded">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center">
                {manualCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" onClick={() => setManualCalendarDate(new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth() + 1, 1))} className="p-1 text-slate-500 hover:bg-slate-100 rounded">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-white">
              {Array.from({ length: calendarOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/50 h-24 p-2 border-b border-r border-slate-100 last:border-r-0"></div>
              ))}
              {Array.from({ length: calendarDays }).map((_, i) => {
                const dateNum = i + 1;
                const dateObj = new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth(), dateNum);
                const dateKey = toDateKey(dateObj);
                const record = historyByDate.get(dateKey);
                const isToday = dateKey === todayKey;

                return (
                  <div 
                    key={dateNum} 
                    className={`h-24 p-1.5 border-b border-r border-slate-100 flex flex-col relative ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-semibold ${isToday ? 'text-blue-600 bg-blue-100 px-1.5 rounded' : 'text-slate-700'}`}>{dateNum}</span>
                    </div>
                    {record ? (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded truncate border border-emerald-100">
                          In: {record.inTime ? new Date(record.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                        <div className="text-[9px] font-mono bg-slate-50 text-slate-600 px-1 py-0.5 rounded truncate border border-slate-200">
                          Out: {record.outTime ? new Date(record.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 w-full text-center">
                        {exceptionsByDate.has(dateKey) ? (
                          exceptionsByDate.get(dateKey).status === 'PENDING' ? (
                            <div className="py-1 rounded bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-200">Pending Request</div>
                          ) : exceptionsByDate.get(dateKey).status === 'REJECTED' ? (
                            <div title={`Reason: ${exceptionsByDate.get(dateKey).resolutionNotes || 'None'}`} className="py-1 rounded bg-rose-50 text-[9px] font-bold text-rose-600 border border-rose-200 cursor-help">Rejected</div>
                          ) : null
                        ) : dateKey < todayKey ? (
                          <button 
                            onClick={() => { setManualDate(dateKey); setShowManualForm(true); }}
                            className="w-full py-1 rounded bg-amber-50 text-[9px] font-bold text-amber-600 hover:bg-amber-100 transition-colors border border-dashed border-amber-200"
                          >
                            Request
                          </button>
                        ) : (
                          <div className="mt-2 text-center text-[9px] font-medium text-slate-300">No Record</div>
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {requestMessage && <div role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{requestMessage}</div>}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Attendance History</h3>
            <p className="text-sm text-slate-500 mt-1">Your marked attendance days and working hours.</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {attendanceHistory.length} day{attendanceHistory.length === 1 ? '' : 's'} marked
          </span>
        </div>
        {attendanceHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">No marked attendance days yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">In Time</th>
                  <th className="px-4 py-3 font-semibold">Out Time</th>
                  <th className="px-4 py-3 font-semibold">Total Hours</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceHistory.map((record, index) => (
                  <tr key={`${record.date}-${index}`} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-700">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{record.inTime ? new Date(record.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{record.outTime ? new Date(record.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatHoursToHoursMinutes(record.totalHours)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{record.status || 'Pending'}</span>{myExceptions.some(exc => toDateKey(exc.date) === toDateKey(record.date) && exc.status === 'PENDING') && <span className="ml-2 text-xs text-blue-700">Correction pending</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openAttendanceEditor(record)} disabled={myExceptions.some(exc => toDateKey(exc.date) === toDateKey(record.date) && exc.status === 'PENDING')} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50" title="Request a time correction">
                        <Edit2 size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleManualAttendance} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{editingAttendance ? 'Edit Attendance Times' : 'Mark Missed Attendance'}</h3>
                <p className="text-sm text-slate-500 mt-1">{editingAttendance ? 'Update the times below. Your manager must approve the correction before it changes the attendance record.' : 'Select the missed day and enter both punch times.'}</p>
              </div>
              <button type="button" onClick={() => setShowManualForm(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {error && errorSource === 'manual' && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {!editingAttendance && <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => setManualCalendarDate(new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth() - 1, 1))} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-bold text-slate-700">{manualCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <button type="button" onClick={() => setManualCalendarDate(new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth() + 1, 1))} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day[0]}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendarOffset }).map((_, index) => <span key={`offset-${index}`} />)}
                  {Array.from({ length: calendarDays }, (_, index) => {
                    const date = new Date(manualCalendarDate.getFullYear(), manualCalendarDate.getMonth(), index + 1);
                    const dateKey = toDateKey(date);
                    const record = historyByDate.get(dateKey);
                    const isFuture = dateKey > todayKey;
                    const isSelected = manualDate === dateKey;
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        disabled={isFuture || Boolean(record)}
                        onClick={() => setManualDate(dateKey)}
                        title={record ? `Marked: ${record.inTime || '--'} - ${record.outTime || '--'}` : isFuture ? 'Future date' : 'Not marked'}
                        className={`h-8 rounded-md text-xs font-semibold transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : record ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : isFuture ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
                  <span><i className="inline-block w-2.5 h-2.5 rounded bg-emerald-100 mr-1" />Marked</span>
                  <span><i className="inline-block w-2.5 h-2.5 rounded bg-amber-50 mr-1" />Not marked</span>
                  <span><i className="inline-block w-2.5 h-2.5 rounded bg-indigo-600 mr-1" />Selected</span>
                </div>
              </div>}
              <label className="block text-sm font-medium text-slate-700">
                {editingAttendance ? 'Attendance Date' : 'Missed Date'}
                <input required type="date" value={manualDate} max={todayKey} readOnly={Boolean(editingAttendance)} onChange={e => setManualDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  In Time
                  <input required type="time" value={manualInTime} onInput={e => setManualInTime(e.currentTarget.value)} onChange={e => setManualInTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Out Time
                  <input required type="time" value={manualOutTime} onInput={e => setManualOutTime(e.currentTarget.value)} onChange={e => setManualOutTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Reason
                <input required type="text" placeholder="e.g. Forgot to clock in" value={manualReason} onChange={e => setManualReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowManualForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={manualSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {manualSaving ? 'Submitting...' : editingAttendance ? 'Request Correction' : 'Submit Attendance Request'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
