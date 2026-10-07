import React, { useEffect, useState } from 'react';
import { FileClock, Search, Filter, Loader2, ArrowUpDown } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';

const formatTime = (t: string) => {
  if (!t) return '--:--';
  try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch(e) { return '--:--'; }
};

const formatDecimalHours = (decimalHours: number | string | null | undefined) => {
  if (!decimalHours) return '0h';
  const num = Number(decimalHours);
  if (isNaN(num)) return '0h';
  
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const getMonthKey = (value: string | null | undefined) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export default function AttendanceRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await attendanceApi.getRecords();
        if (res.data?.success) {
          setRecords(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch attendance records', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const monthOptions = Array.from(
    new Set(
      records
        .map((record) => getMonthKey(record.date))
        .filter((month): month is string => Boolean(month))
    )
  ).sort().reverse();

  const filteredRecords = records.filter((record) => {
    const query = searchTerm.trim().toLowerCase();
    const recordStatus = (record.status || 'Draft').toLowerCase();
    const matchesStatus = statusFilter === 'All' || recordStatus === statusFilter.toLowerCase();
    const matchesMonth = selectedMonth === 'all' || getMonthKey(record.date) === selectedMonth;

    if (!query) return matchesStatus && matchesMonth;

    const employeeName = (record.employeeName || '').toLowerCase();
    const employeeNo = (record.employeeNo || '').toLowerCase();
    const shiftName = (record.shiftName || '').toLowerCase();
    const status = (record.status || '').toLowerCase();

    return matchesStatus && matchesMonth && (
      employeeName.includes(query)
      || employeeNo.includes(query)
      || shiftName.includes(query)
      || status.includes(query)
    );
  });

  const searchedEmployeeRecords = searchTerm.trim()
    ? filteredRecords
    : [];
  const workedDays = new Set(
    searchedEmployeeRecords
      .filter(record => record.inTime || record.outTime || Number(record.totalHours) > 0)
      .map(record => String(record.date).slice(0, 10))
  ).size;
  const totalWorkedHours = searchedEmployeeRecords.reduce(
    (total, record) => total + (Number(record.totalHours) || 0),
    0
  );
  const firstInTime = searchedEmployeeRecords
    .map(record => record.inTime)
    .filter(Boolean)
    .sort()[0];
  const lastOutTime = searchedEmployeeRecords
    .map(record => record.outTime)
    .filter(Boolean)
    .sort()
    .slice(-1)[0];

  const renderCalendar = (monthKey: string, records: any[]) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border border-transparent"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = records.find(r => r.date.startsWith(dateStr));
      
      let statusClass = "bg-slate-50 text-slate-400 border-slate-100";
      let statusDot = "";
      if (record) {
        const status = (record.status || '').toUpperCase();
        if (record.isLate) { statusClass = "bg-rose-50 text-rose-700 border-rose-200"; statusDot = "bg-rose-500"; }
        else if (status === 'APPROVED') { statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200"; statusDot = "bg-emerald-500"; }
        else if (status === 'PENDING') { statusClass = "bg-amber-50 text-amber-700 border-amber-200"; statusDot = "bg-amber-500"; }
        else { statusClass = "bg-indigo-50 text-indigo-700 border-indigo-200"; statusDot = "bg-indigo-500"; }
      }

      days.push(
        <div key={d} className={`p-2 border rounded-lg flex flex-col justify-between min-h-[80px] ${statusClass}`}>
          <span className="font-semibold text-sm">{d}</span>
          {record ? (
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider leading-tight flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
                {record.status || 'Present'}
              </span>
              <span className="text-[10px] opacity-70 whitespace-nowrap overflow-hidden text-ellipsis">{formatTime(record.inTime)} - {formatTime(record.outTime)}</span>
              {record.shiftName && (
                <span className="text-[9px] font-semibold bg-white/50 px-1.5 py-0.5 rounded mt-0.5 truncate border border-black/5">
                  {record.shiftName}
                </span>
              )}
            </div>
          ) : (
             <span className="text-[10px] text-slate-400 font-medium">No Record</span>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
          Monthly Calendar View 
          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{formatMonthLabel(monthKey)}</span>
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-bold uppercase text-slate-400 pb-2">{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const latestSearchedMonth = monthOptions.find(m => 
    searchedEmployeeRecords.some(r => getMonthKey(r.date) === m)
  );
  const displayMonth = selectedMonth !== 'all' ? selectedMonth : latestSearchedMonth;

  return (
    <div className="p-8 space-y-6 min-h-[600px] bg-slate-50 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileClock className="text-indigo-600" /> Attendance Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">View and manage daily attendance logs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <label className="sr-only">Select month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-w-[150px]"
            >
              <option value="all">All months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-64"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <Filter size={16} /> Filter
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg p-2">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </div>
                {['All', 'Pending', 'Approved', 'Draft'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      statusFilter === option
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {searchTerm.trim() && searchedEmployeeRecords.length > 0 && (
        <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Employee Attendance Summary</h3>
              <p className="text-xs text-slate-500 mt-1">Showing details for “{searchTerm.trim()}”</p>
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {searchedEmployeeRecords.length} record{searchedEmployeeRecords.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Worked Days</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{workedDays}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Hours</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatDecimalHours(totalWorkedHours)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">First In Time</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{formatTime(firstInTime)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last Out Time</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{formatTime(lastOutTime)}</p>
            </div>
          </div>
        </div>
      )}

      {searchTerm.trim() && searchedEmployeeRecords.length > 0 && displayMonth && (
        renderCalendar(displayMonth, searchedEmployeeRecords)
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Date <ArrowUpDown size={14} className="inline ml-1 opacity-50" /></th>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Shift</th>
                <th className="px-6 py-4 font-semibold">In Time</th>
                <th className="px-6 py-4 font-semibold">Out Time</th>
                <th className="px-6 py-4 font-semibold">Total Hrs</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {/* Note: This is placeholder data until the backend joins with users */}
                      <span className="font-medium text-slate-800">{record.employeeName || record.employeeNo || 'Unknown Employee'}</span>
                        {record.employeeNo && <span className="text-xs text-slate-500 block">{record.employeeNo}</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {record.shiftName || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {formatTime(record.inTime)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {formatTime(record.outTime)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                      {formatDecimalHours(record.totalHours)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        record.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        record.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {record.status || 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
