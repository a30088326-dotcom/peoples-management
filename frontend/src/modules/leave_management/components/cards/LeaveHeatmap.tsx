import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LeaveApplicationData } from '../../../../lib/api';

export default function LeaveHeatmap({ applications }: { applications: LeaveApplicationData[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  // Build date → leave map for the view month
  const leaveDays: Record<string, { color: string; status: string; typeName: string }> = {};
  applications.forEach(app => {
    if (app.status === 'CANCELLED' || app.status === 'REJECTED') return;
    const start = new Date(app.startDate);
    const end = new Date(app.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getFullYear() === year && cur.getMonth() === month) {
        const key = cur.getDate().toString();
        leaveDays[key] = {
          color: app.leaveType.color,
          status: app.status,
          typeName: app.leaveType.name,
        };
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-slate-700">Leave Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={14} className="text-slate-500" />
          </button>
          <span className="text-xs font-semibold text-slate-600">{MONTHS[month]} {year}</span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronRight size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((wk, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {wk.map((day, di) => {
              if (!day) return <div key={di} />;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const leaveInfo = leaveDays[day.toString()];
              return (
                <div key={di}
                  className="relative flex items-center justify-center rounded-lg text-xs font-medium transition-all"
                  style={{
                    aspectRatio: '1',
                    background: leaveInfo ? `${leaveInfo.color}22` : isToday ? 'rgba(37,99,235,0.08)' : 'transparent',
                    color: leaveInfo ? leaveInfo.color : isToday ? '#2563eb' : '#475569',
                    border: isToday ? '1.5px solid #2563eb' : leaveInfo ? `1.5px solid ${leaveInfo.color}55` : '1.5px solid transparent',
                    fontWeight: isToday || leaveInfo ? '700' : '500',
                  }}
                  title={leaveInfo ? `${leaveInfo.typeName} (${leaveInfo.status})` : undefined}
                >
                  {day}
                  {leaveInfo?.status === 'PENDING' && (
                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563eb' }} />
          <span className="text-[10px] text-slate-500">Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[10px] text-slate-500">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
          <span className="text-[10px] text-slate-500">Today</span>
        </div>
      </div>
    </div>
  );
}
