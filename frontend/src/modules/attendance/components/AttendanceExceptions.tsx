import React, { useEffect, useState } from 'react';
import { AlertTriangle, Search, Filter, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';

export default function AttendanceExceptions() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExceptions = async () => {
      try {
        const res = await attendanceApi.getExceptions();
        if (res.data?.success) {
          setExceptions(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch exceptions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExceptions();
  }, []);

  return (
    <div className="p-8 space-y-6 min-h-[600px] bg-slate-50 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> Exceptions & Approvals
          </h2>
          <p className="text-sm text-slate-500 mt-1">Review and resolve attendance anomalies</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search exceptions..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none w-64"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Exception Type</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No exceptions require your attention.
                  </td>
                </tr>
              ) : (
                exceptions.map((exc, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {new Date(exc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{exc.employeeId?.substring(0, 8)}...</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-amber-700">
                      {exc.type || 'Unknown Exception'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {exc.details || 'No details provided'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        exc.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                        exc.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {exc.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-1.5 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors" title="Approve">
                          <CheckCircle2 size={16} />
                        </button>
                        <button className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors" title="Reject">
                          <XCircle size={16} />
                        </button>
                      </div>
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
