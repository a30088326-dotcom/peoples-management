import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, Loader2, CalendarDays, LogIn, LogOut, Plane } from 'lucide-react';
import { api } from '@/lib/api';
import { formatHoursToHoursMinutes } from '../../../../lib/formatters';
interface Employee {
  id: string;
  employeeNo: string;
  employeeName: string;
  avatar?: string;
}

interface AttendanceRecord {
  inTime: string;
  outTime: string;
  totalHours: number;
  status: string;
  isLate: boolean;
  shiftName?: string;
}

interface LeaveEntry {
  startDate: string;
  endDate: string;
  leaveType: string;
  colorCode: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function fmtTime(dt: string) {
  if (!dt) return '--:--';
  try {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '--:--'; }
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

type AttendanceScope = 'team' | 'organization';

export default function TeamMonthlyCalendar({
  scope = 'team',
}: {
  scope?: AttendanceScope;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceRecord>>>({});
  const [leaves, setLeaves] = useState<Record<string, LeaveEntry[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const endpoint = scope === 'organization'
        ? `/api/attendance/organization-monthly?year=${y}&month=${m}`
        : `/api/attendance/team-monthly?year=${y}&month=${m}`;
      const res = await api.get(endpoint);
      if (res.data?.success) {
        const { employees: emps, attendance: att, leaves: lv } = res.data.data;
        setEmployees(emps);
        setAttendance(att);
        setLeaves(lv);
        // Always set first employee if none selected or previous selection not in list
        if (emps.length > 0) {
          setSelectedEmployee(prev => {
            const stillExists = emps.find((e: Employee) => e.id === prev);
            return stillExists ? prev : emps[0].id;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load team monthly attendance', err);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { fetchData(year, month); }, [year, month, fetchData]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  // Build leave day set for selected employee
  const empLeaves = selectedEmployee && leaves[selectedEmployee] ? leaves[selectedEmployee] : [];
  const leaveDayMap: Record<string, LeaveEntry> = {};
  for (const lv of empLeaves) {
    for (const d of dateRange(lv.startDate, lv.endDate)) {
      leaveDayMap[d] = lv;
    }
  }

  const empAttendance = selectedEmployee && attendance[selectedEmployee] ? attendance[selectedEmployee] : {};
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarDays className="text-indigo-500" size={20} />
            {scope === 'organization' ? 'Organization Attendance Calendar' : 'Team Attendance Calendar'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {scope === 'organization'
              ? 'Monthly attendance and approved leave for every active employee.'
              : 'Monthly attendance and approved leave for your direct-report employees.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Employee Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Users size={16} className="text-slate-400" />
            <select
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.employeeName} ({emp.employeeNo})</option>
              ))}
            </select>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button onClick={prevMonth} className="p-1.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-700 px-2 min-w-[130px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="ml-3 text-sm text-slate-500">Loading attendance data...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No direct reports found.</p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block" />Present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />Late</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-100 border border-violet-200 inline-block" />On Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />No Record</span>
          </div>

          {/* Calendar Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-white">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/40 border-b border-r border-slate-100 h-28" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const rec: AttendanceRecord | undefined = empAttendance[dateStr];
                const leaveEntry = leaveDayMap[dateStr];
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;
                const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

                let cellBg = 'bg-white';
                let statusEl: React.ReactNode = null;

                if (leaveEntry) {
                  cellBg = 'bg-violet-50';
                  statusEl = (
                    <div className="mt-1 px-1 py-0.5 rounded text-[9px] font-bold text-violet-700 bg-violet-100 border border-violet-200 truncate flex items-center gap-0.5">
                      <Plane size={8} className="shrink-0" />
                      {leaveEntry.leaveType}
                    </div>
                  );
                } else if (rec) {
                  const isLate = rec.isLate;
                  cellBg = isLate ? 'bg-amber-50' : 'bg-emerald-50/60';
                  statusEl = (
                    <div className="mt-1 space-y-0.5">
                      <div className={`px-1 py-0.5 rounded text-[9px] font-mono truncate flex items-center gap-0.5 ${isLate ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                        <LogIn size={8} className="shrink-0" />
                        {fmtTime(rec.inTime)}
                      </div>
                      <div className="px-1 py-0.5 rounded text-[9px] font-mono truncate flex items-center gap-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                        <LogOut size={8} className="shrink-0" />
                        {fmtTime(rec.outTime)}
                      </div>
                      {rec.totalHours > 0 && (
                        <div className="text-[8px] text-slate-400 font-semibold text-right pr-0.5">
                          {formatHoursToHoursMinutes(rec.totalHours)}
                        </div>
                      )}
                    </div>
                  );
                } else if (!isFuture && !isWeekend) {
                  statusEl = (
                    <div className="mt-2 text-center text-[9px] text-slate-300 font-medium">No Record</div>
                  );
                }

                return (
                  <div
                    key={day}
                    className={`h-28 p-1.5 border-b border-r border-slate-100 flex flex-col ${cellBg} ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''} ${isWeekend ? 'bg-slate-50/50' : ''}`}
                  >
                    <span className={`text-xs font-bold ${isToday ? 'text-blue-600 bg-blue-100 px-1.5 rounded-md self-start' : isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    {statusEl}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary row */}
          {selectedEmployee && (
            <div className="mt-4 flex gap-6 text-xs text-slate-600 flex-wrap">
              {(() => {
                const att = empAttendance;
                const present = Object.values(att).filter((r: any) => !r.isLate).length;
                const late = Object.values(att).filter((r: any) => r.isLate).length;
                const leaveDays = Object.keys(leaveDayMap).filter(d => d.startsWith(currentMonthStr)).length;
                const totalHrs = Object.values(att).reduce((sum: number, r: any) => sum + (Number(r.totalHours) || 0), 0);
                return (
                  <>
                    <span className="font-semibold">Present: <span className="text-emerald-600">{present}</span></span>
                    <span className="font-semibold">Late: <span className="text-amber-600">{late}</span></span>
                    <span className="font-semibold">On Leave: <span className="text-violet-600">{leaveDays} day(s)</span></span>
                    <span className="font-semibold">Total Hours: <span className="text-indigo-600">{formatHoursToHoursMinutes(totalHrs)}</span></span>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
