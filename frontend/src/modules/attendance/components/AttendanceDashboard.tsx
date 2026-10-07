import React, { useEffect, useState } from 'react';
import { Users, Clock, AlertCircle, FileX, Loader2 } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';

export default function AttendanceDashboard() {
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    pendingExceptions: 0,
    roster: {
      total: 0,
      day: 0,
      late: 0,
      night: 0,
      rotational: 0,
      unassigned: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await attendanceApi.getDashboardStats();
        if (res.data?.success) {
          setStats(prev => ({
            ...prev,
            ...res.data.data,
            roster: {
              ...prev.roster,
              ...(res.data.data.roster || {})
            }
          }));
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-[600px] rounded-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Today's Overview</h2>
        <p className="text-sm text-slate-500">Live attendance statistics for today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Present</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.present}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Late Arrivals</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.late}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">On Leave</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.onLeave}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FileX size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pending Exceptions</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.pendingExceptions}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Roster Distribution</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="font-medium text-slate-600">Total Employees</span>
              <span className="font-bold text-slate-800">{stats.roster.total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50/50 text-indigo-700 rounded-lg">
              <span className="font-medium">Day Shift</span>
              <span className="font-bold">{stats.roster.day}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50/50 text-amber-700 rounded-lg">
              <span className="font-medium">Late Shift</span>
              <span className="font-bold">{stats.roster.late}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800 text-slate-200 rounded-lg">
              <span className="font-medium">Night Shift</span>
              <span className="font-bold">{stats.roster.night}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50/50 text-emerald-700 rounded-lg">
              <span className="font-medium">Rotational</span>
              <span className="font-bold">{stats.roster.rotational}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50/50 text-red-700 rounded-lg">
              <span className="font-medium">Unassigned</span>
              <span className="font-bold">{stats.roster.unassigned}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-slate-400">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p>Exception alerts will appear here</p>
        </div>
      </div>
    </div>
  );
}
