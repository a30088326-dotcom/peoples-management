import { useState, useEffect } from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';

export default function MyShift() {
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchShift = async () => {
      try {
        setLoading(true);
        const res = await attendanceApi.getMyShift();
        if (res.data?.success) {
          setShiftData(res.data.data);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setShiftData(null); 
        } else {
          setError('Failed to load shift information. Please try again later.');
        }
        console.error('Error fetching shift details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShift();
  }, []);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
        <p>Loading your roster details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0" size={18} />
        <p>{error}</p>
      </div>
    );
  }

  if (!shiftData) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <CalendarClock size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">No Roster Group Assigned</h3>
        <p className="text-slate-500 max-w-md">You have not been assigned to a roster group yet. Please contact your reporting manager or HR department.</p>
      </div>
    );
  }

  // Create a map for quick calendar lookups
  const calendarMap: Record<string, any> = {};
  if (shiftData.calendarAssignments) {
    shiftData.calendarAssignments.forEach((ca: any) => {
      calendarMap[ca.date] = ca;
    });
  }

  const shiftsMap: Record<string, any> = {};
  if (shiftData.shifts) {
    shiftData.shifts.forEach((s: any) => {
      shiftsMap[s.id] = s;
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <CalendarClock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Roster Group</h2>
              <p className="text-sm text-slate-500">View your current roster and calendar assignments.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50/50 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ROSTER GROUP</div>
              <div className="text-lg font-bold text-slate-800">{shiftData.name}</div>
              <div className="text-sm text-slate-500 mt-1">{shiftData.description || 'No description provided'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CYCLE</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 shadow-sm">
                {shiftData.rosterCycle}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">My Roster Calendar</h3>
              <div className="flex items-center gap-2">
                <select 
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-indigo-300"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-indigo-300"
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                />
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
                {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50/50 h-20 p-2 border-b border-r border-slate-100 last:border-r-0"></div>
                ))}
                {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map((_, i) => {
                  const date = i + 1;
                  const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                  const assigned = calendarMap[dateString];
                  let shiftDetails = null;
                  
                  if (assigned) {
                    if (assigned.isOffDay) {
                      if (assigned.isHoliday) {
                        shiftDetails = { name: 'POYA DAY', isOff: true, isHoliday: true };
                      } else {
                        shiftDetails = { name: 'OFF DAY', isOff: true };
                      }
                    } else if (assigned.shiftId && shiftsMap[assigned.shiftId]) {
                      shiftDetails = shiftsMap[assigned.shiftId];
                    }
                  }
                  
                  return (
                    <div 
                      key={date} 
                      className="bg-white h-20 p-1.5 border-b border-r border-slate-100 flex flex-col group relative"
                    >
                      <span className="text-xs font-semibold text-slate-700 mb-1">{date}</span>
                      {shiftDetails && (
                        <div className={`mt-0.5 flex flex-col justify-center w-full text-[10px] p-1.5 rounded-md font-medium truncate shadow-sm leading-tight ${(shiftDetails as any).isHoliday ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : (shiftDetails as any).isOff ? 'bg-slate-50 text-slate-500 border border-slate-200/60' : 'bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200/60'}`}>
                          <span className="font-bold truncate">{shiftDetails.name}</span>
                          {!(shiftDetails as any).isOff && shiftDetails.startTime && shiftDetails.endTime && (
                            <span className="text-[9px] text-indigo-500/90 font-mono mt-0.5 tracking-tighter truncate">
                              {formatTime(shiftDetails.startTime)} - {formatTime(shiftDetails.endTime)}
                            </span>
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
      </div>
    </div>
  );
}
