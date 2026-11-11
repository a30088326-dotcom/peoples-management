import { useState, useEffect } from 'react';
import type { Screen } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './modules/auth/pages/Login';
import InviteForm from './modules/onboarding/pages/InviteForm';
import InviteLanding from './modules/onboarding/pages/InviteLanding';
import Onboarding from './modules/onboarding/pages/Onboarding';
import OnboardingHub from './modules/onboarding/pages/OnboardingHub';
import Verification from './modules/onboarding/pages/Verification';
import ContractSign from './modules/onboarding/pages/ContractSign';
import SupervisorDashboard from './modules/leave_management/pages/SupervisorDashboard';
import AdvancedEims from './modules/employee_information/pages/AdvancedEims';
import SSHRHub from './modules/self_service/pages/SSHRHub';
import LeaveManagementHub from './modules/leave_management/pages/LeaveManagementHub';
import AttendanceManagementHub from './modules/attendance/pages/AttendanceManagementHub';
import AccessControlHub from './modules/access_control/pages/AccessControlHub';
import EIMManagementHub from './modules/eim/EIMManagementHub';
import Dashboard from './modules/dashboard/pages/Dashboard';
import ReportingHierarchyHub from './modules/reporting_hierarchy/pages/ReportingHierarchyHub';
import ExecutiveRequestCenter from './modules/leave_management/pages/ExecutiveRequestCenter';
import TeamAttendance from './modules/leave_management/pages/TeamAttendance';
import UnifiedLayout from './components/UnifiedLayout';
import Unauthorized from './components/Unauthorized';
import PerformanceHub from './modules/performance/pages/PerformanceHub';
import ChangePassword from './modules/auth/pages/ChangePassword';
import { AssistantProvider, AssistantPage, FloatingAssistant, ExtensionToolbar } from './modules/assistant/Assistant';
import BotStudio from './modules/assistant/BotStudio';

const SUPER_ADMIN_ONLY_SCREENS: Screen[] = ['access-control', 'assistant-admin'];

const PATH_MAP: Record<string, string> = {
  'assistant': '/assistant',
  'assistant-admin': '/assistant-admin',
  'performance': '/performance',
  'invite': '/invite',
  'invite-landing': '/invite-landing',
  'onboarding': '/onboarding',
  'verification': '/verification',
  'contract': '/contract',
  'supervisor': '/supervisor',
  'executive-request-center': '/executive-request-center',
  'employee-information': '/employee-information',
  'self_service': '/self_service',
  'leave-management': '/leave-management',
  'attendance': '/attendance',
  'dashboard': '/dashboard',
  'reporting-hierarchy': '/reporting-hierarchy',
  'eim': '/eim',
  'access-control': '/access-control',
  'team-attendance': '/team-attendance'
};

const SCREEN_MODULE_MAP: Record<string, string | string[]> = {
  'invite': 'onboarding',
  'dashboard': 'reports_analytics',
  'access-control': 'access_control',
  'employee-information': ['employee_information', 'eim_admin'],
  'eim': ['eim_admin', 'employee_information'],
  'leave-management': 'leave_management',
  'supervisor': 'leave_approval',
  'team-attendance': 'leave_approval',
  'executive-request-center': 'leave_approval',
  'attendance': 'attendance_management',
  'reporting-hierarchy': 'reporting_hierarchy',
  'onboarding': 'onboarding',
  'verification': 'document_verification',
  'self_service': 'self_service'
};

const PERMISSION_SCREEN_ORDER: Screen[] = [
  'executive-request-center', 'supervisor',
  'onboarding', 'attendance', 'employee-information', 'eim',
  'leave-management', 'reporting-hierarchy', 'dashboard', 'self_service'
];

function MainApp() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>(() => {
    const path = window.location.pathname;
    if (path.includes('/invite/') || path.includes('/accept-invite') || window.location.search.includes('token=')) return 'invite-landing';
    if (path === '/invite') return 'invite';
    const foundScreen = Object.keys(PATH_MAP).find(k => PATH_MAP[k] === path) as Screen;
    return foundScreen || 'dashboard';
  });
  const [urlToken, setUrlToken] = useState<string | null>(null);

  useEffect(() => {
    if (screen === 'invite-landing') return;
    if (!isLoggedIn) return;
    const currentPath = window.location.pathname;
    const targetPath = PATH_MAP[screen];
    if (targetPath && currentPath !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, [screen, isLoggedIn]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/invite/')) {
        setScreen('invite-landing');
        return;
      }
      const foundScreen = Object.keys(PATH_MAP).find(k => PATH_MAP[k] === path) as Screen;
      if (foundScreen) {
        setScreen(foundScreen);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let token = params.get('token');
    if (!token && window.location.pathname.includes('/invite/')) {
      token = window.location.pathname.split('/invite/')[1];
    }
    if (!token && window.location.pathname.includes('/accept-invite')) {
      token = window.location.pathname.split('token=')[1] || window.location.pathname.split('/accept-invite/')[1];
    }
    if (token) {
      setUrlToken(token);
      setScreen('invite-landing');
      window.history.replaceState({}, document.title, `/invite/${token}`);
    }
  }, []);

  const isScreenAuthorized = (user: any, scr: Screen) => {
    if (!user) return false;
    if (scr === 'invite-landing') return true;
    if(user.role==='CANDIDATE')return scr==='onboarding'||scr==='contract';
    if (scr === 'assistant-admin') return user.role === 'SUPER_ADMIN';
    if (scr === 'assistant') return ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(user.role);
    if (scr === 'reporting-hierarchy') return ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(user.role);
    // Staff share one hub; the API enforces own/team/company scope on every request.
    if (scr === 'performance') return ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(user.role);
    if (user.role === 'SUPER_ADMIN') return true;
    // Explicit admin grants also govern the manager/executive entry points below.
    const configuredModules=SCREEN_MODULE_MAP[scr];
    const configuredList=Array.isArray(configuredModules)?configuredModules:[configuredModules];
    if(user.role==='ADMIN' && user.permissions?.length && configuredList.some(Boolean)) {
      return configuredList.some(module=>user.permissions.some((p:any)=>p.moduleId===module&&Boolean(p.moduleAccess)&&Boolean(p.canView)));
    }
    if (user.isExecutive) return !SUPER_ADMIN_ONLY_SCREENS.includes(scr);
    if (scr === 'dashboard' && (user.isExecutive || user.isManager)) return true;

    // Executive screens
    if (scr === 'executive-request-center') return Boolean(user.isExecutive || user.role === 'ADMIN');

    // Manager screens
    const managerScreens: Screen[] = [
      'supervisor',
      'team-attendance'
    ];
    if (managerScreens.includes(scr)) {
      return Boolean(user.isManager || user.role === 'ADMIN');
    }

    // Employee self-service screens
    const employeeSelfScreens: Screen[] = [
      'self_service'
    ];
    if (user.role === 'EMPLOYEE' && employeeSelfScreens.includes(scr)) return true;

    // Check custom permissions first
    const requiredModules = SCREEN_MODULE_MAP[scr];
    const moduleList = Array.isArray(requiredModules) ? requiredModules : [requiredModules];
    if (moduleList.some(Boolean) && user.permissions && user.permissions.length > 0) {
      const hasAccess = moduleList.some((requiredModule: string) => {
        const p = user.permissions.find((p: any) => p.moduleId === requiredModule);
        return p && (p.moduleAccess === 1 || p.moduleAccess === true) && (p.canView === 1 || p.canView === true);
      });
      return hasAccess;
    }

    // Role-based defaults
    const isAdminUser = user.role === 'ADMIN';
    if (SUPER_ADMIN_ONLY_SCREENS.includes(scr)) return false;

    if (isAdminUser) {
      // Admins usually don't need Self Service, but they might.
      // We will allow admins to access anything except super admin screens
      return true;
    } else if (user.role === 'CANDIDATE') {
      return scr === 'onboarding' || scr === 'contract';
    }
    return false;
  };

  const getAuthorizedLandingScreen = (currentUser: any): Screen => {
    if (!currentUser) return 'dashboard';
    if (currentUser.role === 'SUPER_ADMIN') return 'dashboard';
    if (currentUser.isExecutive || currentUser.isManager) return 'dashboard';
    if (currentUser.role === 'CANDIDATE') return 'onboarding';
    if (currentUser.role === 'EMPLOYEE') return 'self_service';

    const permittedScreen = PERMISSION_SCREEN_ORDER.find(candidate => isScreenAuthorized(currentUser, candidate));
    return permittedScreen || (currentUser.role === 'EMPLOYEE' ? 'self_service' : 'assistant');
  };

  useEffect(() => {
    if (isLoggedIn && user) {
      if (!isScreenAuthorized(user, screen)) {
        setScreen(getAuthorizedLandingScreen(user));
      }
    }
  }, [isLoggedIn, user, screen]);

  if (isLoading) {
    return <div className="ambient-bg min-h-screen flex items-center justify-center">Loading session...</div>;
  }

  if (isLoggedIn && user?.mustChangePassword) return <ChangePassword />;

  if (screen === 'invite-landing') {
    return <InviteLanding onNavigate={setScreen} inviteToken={urlToken ?? undefined} />;
  }

  if (!isLoggedIn) {
    const path = window.location.pathname;
    const isInviteRoute = path.includes('/invite') || path.includes('/accept-invite') || window.location.search.includes('token=');
    if (path !== '/login' && !isInviteRoute) {
      window.history.replaceState({}, '', '/login');
    }
    
    if (isInviteRoute && (screen as string) !== 'invite-landing') {
      return <div className="ambient-bg min-h-screen flex items-center justify-center">Loading invitation...</div>;
    }
    
    return <Login onLoginSuccess={() => {
      window.history.replaceState({}, '', PATH_MAP[screen] ?? '/dashboard');
    }} />;
  } else if (window.location.pathname === '/login') {
    window.history.replaceState({}, '', PATH_MAP[screen] || '/dashboard');
  }

  const navigate = (s: Screen) => setScreen(s);
  const isUnauthorized = !isScreenAuthorized(user, screen);
  const employeeDashboard: Screen = user?.role === 'CANDIDATE' ? 'onboarding' : 'self_service';

  // The effect above selects the permitted landing page after login/account changes.
  // Do not flash an administrator-only 403 while that redirect is being applied.
  if(isUnauthorized)return <div role="status" className="ambient-bg min-h-screen flex items-center justify-center">Opening your workspace…</div>;

  const renderScreen = () => {
    switch (screen) {
      case 'assistant': return <AssistantPage />;
      case 'assistant-admin': return <BotStudio />;
      case 'performance': return <PerformanceHub />;
      case 'dashboard': return <Dashboard onNavigate={setScreen} />;
      case 'access-control': return <AccessControlHub />;
      case 'employee-information': return <AdvancedEims />;
      case 'self_service': return <SSHRHub onNavigate={navigate} />;
      case 'leave-management': return <LeaveManagementHub onNavigate={navigate} />;
      case 'attendance': return <AttendanceManagementHub onNavigate={navigate} />;
      case 'reporting-hierarchy': return <ReportingHierarchyHub />;
      case 'eim': return <EIMManagementHub onNavigate={navigate} />;
      case 'invite': return <InviteForm onNavigate={navigate} onInviteSent={() => { }} />;
      case 'onboarding':
        return user?.role === 'CANDIDATE'
          ? <Onboarding onNavigate={navigate} />
          : <OnboardingHub onNavigate={navigate} />;
      case 'verification': return <Verification onNavigate={navigate} />;
      case 'contract': return <ContractSign onNavigate={navigate} />;
      case 'supervisor': return <SupervisorDashboard onNavigate={navigate} />;
      case 'team-attendance': return <TeamAttendance />;
      case 'executive-request-center': return <ExecutiveRequestCenter />;
      default: return <div className="p-8">Module not found or deleted during cleanup.</div>;
    }
  };

  return (
    <AssistantProvider key={user?.id}>
    <UnifiedLayout currentScreen={screen} onNavigate={navigate}>
      {!isUnauthorized && user?.role !== 'CANDIDATE' && screen !== 'performance' && <ExtensionToolbar page={screen} />}
      {isUnauthorized ? (
        <Unauthorized onNavigate={navigate} dashboardScreen={employeeDashboard} />
      ) : (
        renderScreen()
      )}
    </UnifiedLayout>
    <FloatingAssistant page={screen} />
    </AssistantProvider>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
