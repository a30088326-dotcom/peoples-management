import React, { useEffect, useState } from 'react';
import { FileBarChart2, Download, Filter, TrendingUp, Users, Clock, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api/client';

export default function AttendanceReports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/api/attendance/dashboard').then(res => {
      if (mounted && res.data?.success) {
        setStats(res.data.data);
      }
    }).catch(err => console.error(err))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

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
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
            <Filter size={16} /> Filter Options
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

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

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <FileBarChart2 size={64} className="mb-4 opacity-20" />
        <h3 className="text-lg font-bold text-slate-600 mb-2">Detailed Analytics Engine</h3>
        <p className="max-w-md text-center text-sm">
          The reporting engine is currently analyzing historical data. Comprehensive charts and exportable payroll reports will be available here soon.
        </p>
      </div>
    </div>
  );
}
