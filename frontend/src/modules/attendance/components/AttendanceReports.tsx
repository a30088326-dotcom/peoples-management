import { useEffect, useState } from 'react';
import { FileBarChart2, Download, Filter, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api/client';
import { attendanceCsv, filterAttendance, type AttendanceReportRow } from '../reporting';

export default function AttendanceReports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceReportRow[]>([]);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true); setError('');
    Promise.all([api.get('/api/attendance/dashboard'),api.get('/api/attendance/records')]).then(([res,rows]) => {
      if (mounted) {
        if (!res.data?.success || !rows.data?.success) throw new Error('Unable to load attendance reports.');
        setStats(res.data.data); setRecords(rows.data.data);
      }
    }).catch(() => { if(mounted) setError('Unable to load attendance reports. Please retry.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [retry]);

  const invalidRange = Boolean(from && to && from > to);
  const filtered = invalidRange ? [] : filterAttendance(records,from,to,query,status);
  const totalHours = filtered.reduce((sum,row)=>sum+(Number(row.totalHours)||0),0);
  const overtimeHours = filtered.reduce((sum,row)=>sum+(Number(row.overtimeHours)||0),0);
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([attendanceCsv(filtered)],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a'); link.href=url;link.download='Attendance_Report.csv';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-[600px] rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart2 className="text-indigo-600" /> Attendance Reports
          </h2>
          <p className="text-sm text-slate-500 mt-1">Analytics and data exports for payroll processing</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>setFiltersOpen(value=>!value)} aria-expanded={filtersOpen} className="app-action px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
            <Filter size={16} /> Filter Options
          </button>
          <button onClick={exportCsv} disabled={loading||Boolean(error)||invalidRange||!filtered.length} className="app-action px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-40">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {error && <div role="alert" className="text-red-600">{error} <button onClick={()=>setRetry(value=>value+1)} className="app-action underline">Retry</button></div>}
      {filtersOpen && <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <label className="text-sm">From<input aria-label="Report from date" className="input-field" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label className="text-sm">To<input aria-label="Report to date" className="input-field" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <label className="text-sm">Employee / shift<input aria-label="Search report" className="input-field" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <label className="text-sm">Status<select aria-label="Report status" className="input-field" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{Array.from(new Set(records.map(row=>row.status).filter(Boolean))).map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <button onClick={()=>{setFrom('');setTo('');setQuery('');setStatus('');}} className="app-action text-sm underline">Clear filters</button>
      </div>}
      {invalidRange && <p role="alert" className="text-red-600">The end date must be on or after the start date.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Present Today</h3>
              <p className="text-xs text-slate-400">Total clocked in</p>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800">
            {loading ? '...' : (stats?.present || 0)}
          </div>
          <div className="text-sm text-slate-500 font-medium mt-2 flex items-center gap-1">
            Real-time metric
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Late Arrivals</h3>
              <p className="text-xs text-slate-400">Exceeded grace period</p>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800">
            {loading ? '...' : (stats?.late || 0)}
          </div>
          <div className="text-sm text-slate-500 font-medium mt-2 flex items-center gap-1">
            Real-time metric
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Pending Exceptions</h3>
              <p className="text-xs text-slate-400">Awaiting approval</p>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800">
            {loading ? '...' : (stats?.pendingExceptions || 0)}
          </div>
          <div className="text-sm text-slate-500 font-medium mt-2 flex items-center gap-1">
            Real-time metric
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <h3 className="font-bold text-slate-800">Filtered attendance records</h3>
        <p className="my-3 text-sm text-slate-600">{filtered.length} records · Worked hours: {totalHours.toFixed(2)} · Overtime hours: {overtimeHours.toFixed(2)}</p>
        {loading ? <p>Loading records…</p> : !error && <table className="w-full text-sm text-left"><thead><tr>{['Date','Employee','Shift','Worked hours','Overtime hours','Status'].map(title=><th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{filtered.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="p-3">{String(row.date).slice(0,10)}</td><td className="p-3">{row.employeeName}<span className="block text-slate-400">{row.employeeNo}</span></td><td className="p-3">{row.shiftName||'Unassigned'}</td><td className="p-3">{(Number(row.totalHours)||0).toFixed(2)}</td><td className="p-3">{(Number(row.overtimeHours)||0).toFixed(2)}</td><td className="p-3">{row.status}</td></tr>)}{!filtered.length&&<tr><td colSpan={6} className="p-6 text-slate-500">No attendance records match these filters.</td></tr>}</tbody></table>}
      </div>
    </div>
  );
}
