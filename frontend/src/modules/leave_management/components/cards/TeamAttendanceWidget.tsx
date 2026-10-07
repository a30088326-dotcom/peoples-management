import React, { useEffect, useState } from 'react';
import { FileClock, Search, Loader2 } from 'lucide-react';
import { formatHoursToHoursMinutes } from '../../../../lib/formatters';
import { attendanceApi } from '../../../attendance/api/attendanceApi';
import { motion } from 'framer-motion';

const formatTime = (t: string) => {
  if (!t) return '--:--';
  try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch(e) { return '--:--'; }
};

export default function TeamAttendanceWidget() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Default to today
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await attendanceApi.getTeamAttendance(selectedDate);
        if (res.data?.success) {
          setRecords(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch team attendance', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [selectedDate]);

  const filteredRecords = records.filter((record) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      record.employeeName?.toLowerCase().includes(query) ||
      record.employeeNo?.toLowerCase().includes(query) ||
      record.shiftName?.toLowerCase().includes(query);
    return matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 w-full mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileClock className="text-indigo-500" size={20} />
            Team Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-1">View the daily attendance of your direct reports.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shift</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">First In</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Last Out</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Total Hrs</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                  <p className="text-sm text-slate-500">Loading attendance data...</p>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                  No attendance records found for this date.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  key={record.id || index} 
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 overflow-hidden">
                         {record.avatar ? (
                            <img src={record.avatar} alt={record.employeeName} className="w-full h-full object-cover" />
                          ) : (
                            record.employeeName?.substring(0, 2).toUpperCase() || 'EMP'
                          )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{record.employeeName}</p>
                        <p className="text-xs text-slate-500">{record.employeeNo || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{record.shiftName || 'Unassigned'}</td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700 font-mono">
                      {formatTime(record.inTime)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700 font-mono">
                      {formatTime(record.outTime)}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm font-semibold text-slate-700">
                    {record.totalHours ? formatHoursToHoursMinutes(record.totalHours) : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      !record.id ? 'bg-slate-100 text-slate-600' :
                      record.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                      record.status === 'Absent' ? 'bg-rose-100 text-rose-700' :
                      record.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {!record.id ? 'No Record' : record.status || 'Present'}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
