import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Clock, Calendar, CheckCircle, Save, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth as getDays, getDay, getDate } from 'date-fns';
import { api } from '../../../../lib/api/client';
import { holidayDates } from '../../calendarImport';
import { calendarDate, calendarDefaults, weekendSettings, workingDayCount, isWeekend } from '../../calendarConfiguration';
interface DayType {
  id: string;
  name: string;
  type: string;
  displayColor: string;
}

interface CalendarGroup {
  id: string;
  displayName: string;
  weekendConfiguration: Record<string, string | boolean>;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function HolidayCalendarTab() {
  const currentYear = new Date().getFullYear();
  const [years] = useState(Array.from({length:5},(_,index)=>currentYear-2+index));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [configLoading, setConfigLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState('');
  const [groups, setGroups] = useState<CalendarGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [dayTypes, setDayTypes] = useState<DayType[]>([]);
  const [standardWorkingDayTypeId, setStandardWorkingDayTypeId] = useState<string>('');
  
  const [paintedDays, setPaintedDays] = useState<Record<string, string>>({}); // date -> dayTypeId
  const [isLoading, setIsLoading] = useState(false);
  
  // Popover State
  const [activePopover, setActivePopover] = useState<{ date: string, x: number, y: number } | null>(null);

  // Status State
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pagination State
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const holidayType = dayTypes.find(t => t.name.toLowerCase().includes('holiday') || t.name.toLowerCase().includes('poya')) || dayTypes[0];
    if (!holidayType) {
      setActionError('No day types configured to map holidays to!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const processText = (text: string) => {
      const newPaintedDays = { ...paintedDays };
      let importedCount = 0;
      
      const matches = holidayDates(text,selectedYear);
      
      matches.forEach(dateStr => { newPaintedDays[dateStr] = holidayType.id; importedCount++; });

      if (importedCount > 0) {
        setPaintedDays(newPaintedDays);
        setActionSuccess(`Successfully imported ${importedCount} holidays!`);
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(`No valid dates found for ${selectedYear}. Use YYYY-MM-DD, MM/DD/YYYY or DD-MM-YYYY.`);
      }
    };

    if (file.type.startsWith('image/')) {
      setActionError('Image OCR is no longer supported. Please upload a CSV or text file.');
      return;
    }

    const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) processText(text);
      };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setConfigLoading(true);
    setActionError(null);
    try {
      const [groupsRes, typesRes] = await Promise.all([
        api.get('/api/leave-management/calendar-groups'),
        api.get('/api/leave-management/day-types')
      ]);

      if (groupsRes.data.success) {
        setGroups(groupsRes.data.data.map((group: any) => ({ ...group, weekendConfiguration: weekendSettings(group.weekendConfiguration) })));
        if (groupsRes.data.data.length > 0) {
          setSelectedGroup(groupsRes.data.data[0].id);
        }
      }
      if (typesRes.data.success) {
        setDayTypes(typesRes.data.data);
        // Find a standard working day type if one exists, or default to the first one
        const wd = typesRes.data.data.find((dt: any) => dt.type === 'WORKING_DAY');
        if (wd) setStandardWorkingDayTypeId(wd.id);
      }
    } catch (error) {
      console.error('Failed to load initial config', error);
      setActionError('Unable to load calendar configuration. Please retry.');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleLoadCalendar = async () => {
    if (!selectedGroup || !dayTypes.length || isLoading) return;
    setIsLoading(true);
    setLoadedKey('');
    setActionError(null);
    setPaintedDays({});
    
    try {
      const res = await api.get(`/api/leave-management/holiday-calendar/${selectedYear}/${selectedGroup}`);
      if (res.data.success && res.data.data) {
        const existingDays = res.data.data.days || [];
        const loaded: Record<string, string> = {};
        existingDays.forEach((d: any) => {
          const dateStr = format(calendarDate(d.date), 'yyyy-MM-dd');
          loaded[dateStr] = d.dayTypeId;
        });
        setPaintedDays(loaded);
      } else {
        // Prefill based on group weekend config
        const group = groups.find(g => g.id === selectedGroup);
        if (group) setPaintedDays(calendarDefaults(selectedYear, group.weekendConfiguration, dayTypes, standardWorkingDayTypeId));
      }
      setLoadedKey(`${selectedYear}:${selectedGroup}`);
    } catch (error) {
      console.error('Failed to load calendar', error);
      setActionError('Unable to load this calendar. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCalendar = async () => {
    if (loadedKey!==`${selectedYear}:${selectedGroup}` || !selectedGroup || !Object.keys(paintedDays).length || isLoading) return;
    setIsLoading(true);
    try {
      const daysArray = Object.keys(paintedDays).map(date => ({
        date,
        dayTypeId: paintedDays[date]
      }));

      const payload = {
        year: selectedYear,
        calendarGroupId: selectedGroup,
        days: daysArray
      };

      const res = await api.post('/api/leave-management/holiday-calendar', payload);
      if (res.data.success) {
        setActionSuccess('Calendar saved successfully!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Failed to save calendar', error);
      setActionError('Failed to save calendar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayClick = (dateStr: string, e: React.MouseEvent) => {
    if (isLoading || loadedKey!==`${selectedYear}:${selectedGroup}`) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActivePopover({
      date: dateStr,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 268)),
      y: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 300))
    });
  };

  const handlePaintDay = (dayTypeId: string) => {
    if (activePopover) {
      setPaintedDays(prev => ({ ...prev, [activePopover.date]: dayTypeId }));
      setActivePopover(null);
    }
  };

  // Outside click to close popover
  useEffect(() => {
    const handleClickOutside = () => setActivePopover(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getDaysInMonth = (monthIndex: number) => {
    const date = new Date(selectedYear, monthIndex, 1);
    const daysInMonth = getDays(date);
    const startDayOfWeek = getDay(date); // 0 (Sun) to 6 (Sat)
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null); // empty padding
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(format(new Date(selectedYear, monthIndex, i), 'yyyy-MM-dd'));
    }
    return days;
  };

  // Calculate working days
  const settings = groups.find(group => group.id === selectedGroup)?.weekendConfiguration || {};
  const workingDaysCount = loadedKey === `${selectedYear}:${selectedGroup}`
    ? workingDayCount(selectedYear, paintedDays, settings, dayTypes) : 0;

  return (
    <div className="relative min-h-[calc(100vh-160px)] pb-24">
      {configLoading ? <p role="status">Loading calendar configuration…</p> : (!groups.length || !dayTypes.length) && <div role="status" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">No holiday calendar is configured. Calendar groups and day types must be configured before loading or saving a calendar. No public holidays have been assumed.<button onClick={fetchInitialData} className="app-action ml-3 underline">Retry configuration</button></div>}
      {/* Top Control Panel */}
      <div className="bg-white/60 p-6 rounded-[2rem] border border-white/50 backdrop-blur-md shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4 min-w-0">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Year</label>
            <select aria-label="Calendar year" disabled={isLoading}
              value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); setPaintedDays({}); setLoadedKey(''); }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Calendar Group</label>
            <select aria-label="Calendar group" disabled={isLoading}
              value={selectedGroup}
              onChange={(e) => { setSelectedGroup(e.target.value); setPaintedDays({}); setLoadedKey(''); }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none min-w-[200px]"
            >
              {!groups.length && <option value="">No calendar groups configured</option>}
              {groups.map(g => <option key={g.id} value={g.id}>{g.displayName}</option>)}
            </select>
          </div>

          <button 
            onClick={handleLoadCalendar}
            disabled={configLoading||isLoading||!selectedGroup||!dayTypes.length}
            className="mt-5 btn-primary glass bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
          >
            <Calendar size={18} /> Load Calendar
          </button>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv,.txt"
            onChange={handleImport} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading||loadedKey!==`${selectedYear}:${selectedGroup}`}
            className={`app-action px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${isLoading ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            {isLoading ? <span className="animate-spin text-blue-500">⏳</span> : <Download size={16} />}
            {isLoading ? 'Loading…' : 'Import'}
          </button>
          <span className="text-sm text-slate-500 flex items-center gap-2"><Clock size={16}/> Asia/Colombo (UTC+05:30)</span>
        </div>
      </div>

      {/* Single Month Calendar Grid */}
      <div className="flex justify-center w-full">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-white/60 shadow-2xl p-8 w-full max-w-4xl min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => setCurrentMonthIndex(prev => Math.max(0, prev - 1))}
              disabled={currentMonthIndex === 0}
              className="app-action p-3 hover:bg-slate-100 rounded-2xl text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all app-action-icon"
            >
              <ChevronLeft size={24} />
            </button>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {MONTHS[currentMonthIndex]} <span className="text-blue-600">{selectedYear}</span>
            </h3>
            <button 
              onClick={() => setCurrentMonthIndex(prev => Math.min(11, prev + 1))}
              disabled={currentMonthIndex === 11}
              className="app-action p-3 hover:bg-slate-100 rounded-2xl text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all app-action-icon"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1.5 sm:gap-4 mb-4">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-sm font-black text-slate-400 tracking-widest">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1.5 sm:gap-4">
            {getDaysInMonth(currentMonthIndex).map((dateStr, dIndex) => {
              if (!dateStr) return <div key={`empty-${dIndex}`} className="aspect-square" />;
              
              const dtId = paintedDays[dateStr];
              const dt = dayTypes.find(d => d.id === dtId);
              const color = dt?.displayColor || '#e2e8f0'; // default slate-200

              return (
                <button type="button" aria-label={dateStr} disabled={isLoading || loadedKey !== `${selectedYear}:${selectedGroup}`} title={dt?.name || (isWeekend(calendarDate(dateStr), settings, dayTypes) ? 'Weekend' : 'Working day')}
                  key={dateStr}
                  onClick={(e) => handleDayClick(dateStr, e)}
                  className="aspect-square rounded-2xl flex items-center justify-center text-sm sm:text-2xl font-bold cursor-pointer hover:ring-4 ring-slate-900 ring-offset-2 transition-all group relative shadow-sm"
                  style={{ 
                    backgroundColor: color,
                    color: !dt || dt.type === 'WORKING_DAY' ? '#1e293b' : '#ffffff',
                    boxShadow: dt && dt.type !== 'WORKING_DAY' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {getDate(calendarDate(dateStr))}
                  
                  {/* Hover Tooltip */}
                  {dt && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 w-max max-w-[160px]">
                      <div className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-2xl text-center">
                        {dt.name}
                      </div>
                      <div className="w-3 h-3 bg-slate-900 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Painting Popover */}
      <AnimatePresence>
        {activePopover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="dialog" aria-label="Calendar day type" className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-slate-100 w-64 overflow-hidden"
            style={{ left: activePopover.x, top: activePopover.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {format(calendarDate(activePopover.date), 'MMM d, yyyy')}
              </span>
              <button onClick={() => setActivePopover(null)} className="app-action text-slate-400 hover:text-slate-600 app-action-icon">
                <X size={14} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {dayTypes.map(dt => (
                <button
                  key={dt.id}
                  onClick={() => handlePaintDay(dt.id)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-700">{dt.name}</span>
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: dt.displayColor }}></div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Action Footer */}
      <div className="holiday-calendar-footer fixed bottom-0 left-0 lg:left-64 right-0 p-4 sm:pr-56 z-40">
        <div className="max-w-7xl mx-auto">
          {actionError && (
            <div className="mb-4 flex items-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl shadow-xl">
              <span className="text-sm font-medium flex-1">{actionError}</span>
              <button onClick={() => setActionError(null)} className="app-action text-white/70 hover:text-white app-action-icon"><X size={16} /></button>
            </div>
          )}
          {actionSuccess && (
            <div className="mb-4 flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-xl">
              <CheckCircle size={18} className="shrink-0" />
              <span className="text-sm font-medium flex-1">{actionSuccess}</span>
              <button onClick={() => setActionSuccess(null)} className="app-action text-white/70 hover:text-white app-action-icon"><X size={16} /></button>
            </div>
          )}
          <div className="glass bg-white/70 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Metrics</p>
                <p className="text-sm sm:text-lg font-black text-slate-800">
                  Total Working Days: <span className="text-blue-600">{workingDaysCount}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleSaveCalendar}
                disabled={isLoading||loadedKey!==`${selectedYear}:${selectedGroup}`||!Object.keys(paintedDays).length}
                className="app-action px-3 sm:px-6 py-2.5 whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Save size={18} /> Save Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
