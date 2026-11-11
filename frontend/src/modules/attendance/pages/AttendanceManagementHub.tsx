import { useEffect, useRef, useState } from 'react';
import { 
  CalendarClock, 
  Settings2, 
  Users, 
  UserPlus,
  FileClock,
  AlertTriangle,
  FileBarChart2,
  Search
} from 'lucide-react';
import type { Screen } from '@/types';
import ShiftManagement from '../components/ShiftManagement';
import RosterGroups from '../components/RosterGroups';

import AttendanceDashboard from '../components/AttendanceDashboard';
import AttendanceRecords from '../components/AttendanceRecords';
import AttendanceExceptions from '../components/AttendanceExceptions';
import AttendanceReports from '../components/AttendanceReports';
import AssignEmployee from '../components/AssignEmployee';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export default function AttendanceManagementHub({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [activeTab]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: CalendarClock },
    { id: 'shifts', label: 'Shift Management', icon: Settings2 },
    { id: 'roster-groups', label: 'Rosters', icon: Users },
    { id: 'records', label: 'Attendance Records', icon: FileClock },
    { id: 'exceptions', label: 'Exceptions & Approvals', icon: AlertTriangle },
    { id: 'reports', label: 'Reports', icon: FileBarChart2 },
    { id: 'assign-employee', label: 'Assign Employee', icon: UserPlus },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AttendanceDashboard />;
      case 'shifts': return <ShiftManagement />;
      case 'roster-groups': return <RosterGroups />;
      case 'records': return <AttendanceRecords />;
      case 'exceptions': return <AttendanceExceptions />;
      case 'reports': return <AttendanceReports />;
      case 'assign-employee': return <AssignEmployee />;
      default: return null;
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#F4F7FC]" data-testid="attendance-workspace">
      {/* Header */}
      <div className="bg-white shrink-0 z-30 border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 min-h-20 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <CalendarClock size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Attendance & Roster</h1>
              <p className="text-sm text-slate-500">Manage shifts, schedules, and daily attendance</p>
            </div>
          </div>
          
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors w-48 lg:w-64 max-w-full"
              />
            </div>
            
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-6 py-6 flex flex-1 min-h-0 gap-4 lg:gap-8">
        {/* Sidebar */}
        <div className="w-48 xl:w-64 shrink-0 min-h-0 overflow-y-auto" data-testid="attendance-tabs">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors group ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                  }`}
                >
                  <Icon 
                    size={20} 
                    className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} 
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 min-h-0">
          <div ref={contentRef} role="region" aria-label="Attendance tab content" tabIndex={0} className="h-full bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] [overflow-anchor:none]" data-testid="attendance-content">
              <div key={activeTab}>
                {renderContent()}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
