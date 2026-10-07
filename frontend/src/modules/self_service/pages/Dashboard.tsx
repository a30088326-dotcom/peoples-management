import React, { useState, useEffect } from 'react';
import { User, ArrowRight, CalendarDays, Database, FileText, Users, Clock, Network, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import type { Screen } from '../../../types';
import { leavesApi } from '../../../lib/api/leaves';
import EmployeeSummaryCard from '../components/cards/EmployeeSummaryCard';
import QuickInformationCard from '../components/cards/QuickInformationCard';
import QuickActions from '../components/actions/QuickActions';
import { profileRequestApi } from '../components/ProfileRequestForm';

import { api } from '../../../lib/api/client';

const ACCESS_MODULES: { id: string; label: string; screen: Screen; icon: React.ReactNode; alwaysVisible?: boolean; requiresManager?: boolean }[] = [
  { id: 'employee_assistant', label: 'Employee Assistant', screen: 'assistant', icon: <FileText size={18} />, alwaysVisible: true },
  { id: 'reporting_hierarchy', label: 'Reporting Hierarchy', screen: 'reporting-hierarchy', icon: <Network size={18} />, alwaysVisible: true },
  { id: 'performance_management', label: 'My Performance', screen: 'performance', icon: <Users size={18} /> },
  { id: 'eim_admin', label: 'EIM Admin', screen: 'eim', icon: <Database size={18} /> },
  { id: 'employee_information', label: 'Employee Information', screen: 'employee-information', icon: <Users size={18} /> },
  { id: 'attendance_management', label: 'Attendance & Roster', screen: 'attendance', icon: <Clock size={18} /> },
  { id: 'leave_management', label: 'Leave Management', screen: 'leave-management', icon: <CalendarDays size={18} />, requiresManager: true },
  { id: 'leave_approval', label: 'Leave Approvals', screen: 'supervisor', icon: <ShieldCheck size={18} />, requiresManager: true },
  { id: 'onboarding', label: 'Onboarding', screen: 'onboarding', icon: <FileText size={18} /> },
];

export default function Dashboard({ employee, loading, onNavigate, onTabNavigate }: { employee: any, loading: boolean, onNavigate?: (screen: Screen) => void, onTabNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    leaveBalance: 0,
    pendingRequests: 0,
    attendanceToday: 'N/A',
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [entRes, appRes, attRes, profileRes, exceptionsRes] = await Promise.all([
          leavesApi.getEntitlements(),
          leavesApi.getApplications({limit:500}),
          api.get<any>('/api/attendance/my-today'),
          profileRequestApi.my(),
          api.get<any>('/api/attendance/my-exceptions')
        ]);
        
        let leaveBalance = 0;
        if (entRes.data?.data) {
          leaveBalance = entRes.data.data.reduce((acc: number, curr: any) => {
            const entitlement = (Number(curr.totalDays) || 0) + (Number(curr.carryForwardDays) || 0);
            const used = Number(curr.usedDays) || 0;
            const pending = Number(curr.pendingDays) || 0;
            return acc + (entitlement - used - pending);
          }, 0);
        }
        
        let pendingRequests = 0;
        if (appRes.data?.data) {
          pendingRequests = appRes.data.data.filter((a: any) => a.status?.includes('PENDING') || a.status?.includes('Pending')).length;
        }
        pendingRequests += [...(profileRes.data.data||[]),...(exceptionsRes.data.data||[])].filter(a=>a.status==='PENDING').length;

        const lastLog = attRes.data.data?.at(-1);
        const attendanceToday = !lastLog ? 'Not Clocked In' : lastLog.logType === 'Out' ? 'Clocked Out' : lastLog.logType === 'BreakIn' ? 'On Break' : 'Clocked In';

        setStats({
          leaveBalance: Math.max(0, leaveBalance),
          pendingRequests,
          attendanceToday
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  if (!employee) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      <User size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-lg font-bold text-slate-700 mb-2">Employee Profile Not Found</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        No employee record was found linked to your account. If you believe this is an error, please contact your HR administrator.
      </p>
    </div>;
  }

  const { personalDetails, employmentDetails } = employee;

  const displayData = {
    fullName: personalDetails?.fullName || [personalDetails?.firstName||employee.firstName,personalDetails?.lastName||employee.lastName].filter(Boolean).join(' ') || employee.user?.name || 'N/A',
    designation: employmentDetails?.designation || 'N/A',
    department: employmentDetails?.department || 'N/A',
    employeeNumber: employee.employeeNo || 'N/A',
    employmentType: employmentDetails?.employmentType || 'N/A',
    email: personalDetails?.workEmail || personalDetails?.personalEmail || employee.contactDetails?.official?.email || employee.email || employee.user?.email || 'N/A',
    mobileNumber: personalDetails?.personalMobile || employee.contactDetails?.residential?.personal?.mobile || employee.phone || 'N/A',
    dateJoined: employmentDetails?.dateJoined ? new Date(employmentDetails.dateJoined).toLocaleDateString() : 'N/A',
    officeLocation: employee.workstationDetails?.locationName || 'N/A',
    reportingManager: employmentDetails?.reportingManager || 'N/A',
    profilePicture: personalDetails?.profilePicture || null
  };

  const accessibleModules = ACCESS_MODULES.filter(module => {
    if (user?.role === 'EMPLOYEE') {
      if (module.alwaysVisible) return true;
      if (module.requiresManager && (user as any)?.isManager) return true;
      return false;
    }
    if (module.alwaysVisible) return true;
    if (module.requiresManager && ((user as any)?.isManager || user?.role === 'ADMIN')) return true;
    const permission = user?.permissions?.find((item: any) => item.moduleId === module.id);
    return permission && Boolean(permission.moduleAccess) && Boolean(permission.canView);
  });

  const calculateYearsOfService = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    const joined = new Date(dateString);
    if (isNaN(joined.getTime())) return 'N/A';
    const now = new Date();
    const diff = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return diff.toFixed(1);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Employee Summary Profile Card */}
      <EmployeeSummaryCard displayData={displayData} />

      {accessibleModules.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Accessible Modules</h2>
              <p className="text-sm text-slate-500 mt-1">Modules assigned to your employee account by HR.</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {accessibleModules.length} available
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {accessibleModules.map(module => (
              <button
                key={module.id}
                type="button"
                onClick={() => onNavigate?.(module.screen)}
                className="flex items-center gap-3 p-4 text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">{module.icon}</span>
                <span className="flex-1 text-sm font-bold text-slate-700">{module.label}</span>
                <ArrowRight size={15} className="text-slate-400" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Quick Information */}
        <QuickInformationCard 
          statsLoading={statsLoading} 
          stats={stats} 
          displayData={displayData} 
          calculateYearsOfService={calculateYearsOfService} 
        />

        {/* 3. Quick Actions */}
        <QuickActions onNavigate={onTabNavigate} />

      </div>
    </div>
  );
}
