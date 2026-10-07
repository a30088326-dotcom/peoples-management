import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';

export default function RosterCalendar() {
  const [calendar, setCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For a real calendar, we would use a date library like date-fns, 
  // but for this placeholder, we'll just mock a week view.
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const res = await attendanceApi.getCalendar();
        if (res.data?.success) {
          setCalendar(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch calendar', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, []);

  return (
    <div className="p-8 space-y-6 min-h-[600px] bg-white rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-indigo-600" /> Roster Calendar
          </h2>
          <p className="text-sm text-slate-500 mt-1">Weekly shift assignments for your team</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button className="px-3 py-1.5 text-sm font-medium bg-white shadow-sm rounded-md text-slate-800">Week</button>
            <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">Month</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
              Aug 24 - Aug 30
            </span>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-8 bg-slate-50 border-b border-slate-200">
          <div className="p-4 font-semibold text-slate-500 text-sm flex items-center gap-2 border-r border-slate-200">
            <Users size={16} /> Employees
          </div>
          {days.map((day, i) => (
            <div key={i} className="p-4 text-center border-r border-slate-200 last:border-0">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
              <div className="text-sm font-medium text-slate-700 mt-1">{24 + i} Aug</div>
            </div>
          ))}
        </div>
        
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            calendar.map((row) => {
              // Determine which day is working vs off based on their actual default shift setup
              const isWorkingDay = (day: string) => row.weeklyWorkingDays?.includes(day);

              return (
                <div key={row.employeeId} className="grid grid-cols-8 hover:bg-slate-50/30 transition-colors">
                  <div className="p-4 border-r border-slate-200 flex flex-col justify-center gap-1 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-700 truncate">{row.firstName} {row.lastName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{row.employeeNo}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {row.designation} • {row.department}
                    </div>
                    <div className="text-[10px] font-semibold text-indigo-600 truncate mt-0.5">
                      {row.rosterGroupName || 'Unassigned'}
                    </div>
                  </div>
                  {days.map((day, i) => (
                    <div key={i} className="p-2 border-r border-slate-200 last:border-0 relative group">
                      {row.shiftName && isWorkingDay(day) ? (
                        <div className={`h-full w-full rounded border flex flex-col items-center justify-center cursor-pointer transition-colors ${
                          row.shiftName.includes('Night') ? 'border-slate-300 bg-slate-800 text-slate-100 hover:bg-slate-700' :
                          row.shiftName.includes('Late') ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' :
                          'border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100'
                        }`}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${row.shiftName.includes('Night') ? 'text-slate-100' : 'text-indigo-700'}`}>
                            {row.shiftName.split(' ')[0]}
                          </span>
                          <span className={`text-[9px] ${row.shiftName.includes('Night') ? 'text-slate-400' : 'text-indigo-500'}`}>
                            {row.startTime?.slice(0,5)} - {row.endTime?.slice(0,5)}
                          </span>
                        </div>
                      ) : (
                        <div className="h-full w-full rounded border border-slate-100 bg-slate-50 flex items-center justify-center">
                          <span className="text-xs font-semibold text-slate-400">OFF</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
