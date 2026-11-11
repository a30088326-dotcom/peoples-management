import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { eimsApi } from '../../../lib/api/employee_information_audit';
import SSHRDashboard from './Dashboard';
import MyProfile from './MyProfile';
import MyRequests from './MyRequests';
import MyLeave from './MyLeave';
import MyAttendance from './MyAttendance';
import MyShift from './MyShift';
import MyReportingManager from './MyReportingManager';
import type { Screen } from '../../../types';
import { CustomEmployeeFields } from '../../assistant/Assistant';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

export default function SSHRHub({ onNavigate }: { onNavigate?: (screen: Screen) => void }) {
  const validTab = () => ['dashboard','profile','requests','leave','attendance','shift','manager'].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'dashboard';
  const [activeTab, setActiveTab] = useState(validTab);
  useEffect(() => { const handler = () => setActiveTab(validTab()); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler); }, []);
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await eimsApi.getMyEmployee();
        if (res.data?.data) {
          setEmployee(res.data.data);
        }
      } catch (err: any) {
        // 404 means no employee record for this user â€” that's fine, show empty state
        if (err.response?.status !== 404) {
          console.error('Failed to fetch employee details', err);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchEmployee();
    } else {
      setLoading(false);
    }
    const refresh=()=>{if(document.visibilityState==='visible'&&user)fetchEmployee();};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  }, [user]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'requests', label: 'My Requests' },
    { id: 'leave', label: 'My Leave' },
    { id: 'attendance', label: 'My Attendance' },
    { id: 'shift', label: 'Roster Group' },
    { id: 'manager', label: 'Reporting Manager' }
  ];

  return (
    <div className="workspace-frame bg-slate-50">
      {/* Top Header / Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 pt-6 pb-0 shrink-0 z-10">
        <h1 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Self Service</h1>
        <div className="flex space-x-8 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => {
                setActiveTab(tab.id);
                window.history.replaceState({}, '', `${window.location.pathname}#${tab.id}`);
              }}
              className={`pb-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'profile' ? (
        <div className="workspace-frame p-4 sm:p-8">
          <MyProfile employee={employee} loading={loading}>
            {employee?.id && <CustomEmployeeFields employeeId={employee.id} />}
          </MyProfile>
        </div>
      ) : <WorkspaceScrollArea resetKey={activeTab} label="Self service tab content" className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <SSHRDashboard employee={employee} loading={loading} onNavigate={onNavigate} onTabNavigate={tab => { setActiveTab(tab); window.history.replaceState({},'',`${window.location.pathname}${window.location.search}#${tab}`); }} />}
          {activeTab === 'requests' && <MyRequests employee={employee} loading={loading} />}
          {activeTab === 'leave' && <MyLeave employee={employee} loading={loading} />}
          {activeTab === 'attendance' && <MyAttendance />}
          {activeTab === 'shift' && <MyShift />}
          {activeTab === 'manager' && <MyReportingManager />}
          
          {['dashboard', 'profile', 'requests', 'leave', 'attendance', 'shift', 'manager'].indexOf(activeTab) === -1 && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">{tabs.find(t => t.id === activeTab)?.label}</h2>
                <p className="text-slate-500">This module is under construction for a future phase.</p>
              </div>
            </div>
          )}
        </div>
      </WorkspaceScrollArea>}
    </div>
  );
}
