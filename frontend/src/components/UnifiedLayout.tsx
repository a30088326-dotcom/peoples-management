import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, CalendarClock, Briefcase, Settings, 
  ChevronRight, LogOut, Search, User, FileText, ClipboardList, Target,
  Building2, ShieldCheck, PenTool, Home, CalendarDays, Clock, UserPlus, RefreshCw, Eye, CreditCard, CheckCircle2, Shield, Database, Network
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersApi, type MemberData } from '../lib/api';
import { Screen } from '../types';
import type { Section } from '../modules/performance/types';
import { performanceApi } from '../modules/performance/api/performanceApi';
import { performanceHash, performanceNavigation, performanceSectionFromHash } from '../modules/performance/navigation';
import { sectionsFor } from '../modules/performance/roleSections';
import WorkspaceScrollArea from './WorkspaceScrollArea';

interface UnifiedLayoutProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  children: React.ReactNode;
}

// ─── GRAND NAVIGATION STRUCTURE ────────────────────────────────────────────────
// roles: who sees this item by default (when no permissions configured)
// moduleId: permission key used to grant access via Access Control
const NAV_STRUCTURE = [
  { group: 'HR Assistant', items: [
    { id: 'assistant', label: 'Employee Assistant', icon: <ClipboardList size={18} />, roles: ['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'], alwaysVisible: true },
    { id: 'assistant-admin', label: 'Bot Studio', icon: <Settings size={18} />, roles: ['SUPER_ADMIN'] }
  ] },
  {
    group: 'Performance Management',
    items: [
      { id: 'performance', label: 'Performance', icon: <Target size={18} />, roles: ['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'], alwaysVisible: true }
    ]
  },
  {
    group: 'System Settings',
    items: [
      { id: 'access-control', label: 'Access Control', icon: <Shield size={18} />, roles: ['SUPER_ADMIN'] }
    ]
  },
  {
    group: 'Analytics',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['ADMIN'], moduleId: 'reports_analytics' }
    ]
  },
  {
    group: 'Onboarding',
    items: [
      { id: 'onboarding', label: 'Onboarding', icon: <User size={18} />, roles: ['ADMIN'], moduleId: 'onboarding' },
      { id: 'verification', label: 'Doc Verification', icon: <ShieldCheck size={18} />, roles: ['ADMIN'], moduleId: 'document_verification' }
    ]
  },
  {
    group: 'Enterprise Configuration',
    items: [
      { id: 'eim', label: 'EIM Admin', icon: <Database size={18} />, roles: ['ADMIN'], moduleId: 'eim_admin' }
    ]
  },
  {
    group: 'Employee Information',
    items: [
      { id: 'employee-information', label: 'Employee Information', icon: <Users size={18} />, roles: ['ADMIN'], moduleId: 'employee_information' }
    ]
  },
  {
    group: 'Reporting Hierarchy',
    items: [
      { id: 'reporting-hierarchy', label: 'Reporting Hierarchy', icon: <Network size={18} />, roles: ['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'], moduleId: 'reporting_hierarchy' }
    ]
  },
  {
    group: 'Self Service',
    items: [
      { id: 'self_service', label: 'Self Service', icon: <User size={18} />, roles: ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'], moduleId: 'self_service', alwaysVisible: true }
    ]
  },
  {
    group: 'Leave Management',
    items: [
      { id: 'leave-management', label: 'Leave Management', icon: <CalendarDays size={18} />, roles: ['ADMIN', 'EMPLOYEE'], moduleId: 'leave_management', requiresManager: true },
      { id: 'supervisor', label: 'Team Leave Requests', icon: <CheckCircle2 size={18} />, roles: ['ADMIN', 'EMPLOYEE'], moduleId: 'leave_approval', requiresManager: true },
      { id: 'team-attendance', label: 'Team Attendance', icon: <Clock size={18} />, roles: ['ADMIN', 'EMPLOYEE'], moduleId: 'leave_approval', requiresManager: true },
      { id: 'executive-request-center', label: 'CEO Request Center', icon: <Briefcase size={18} />, roles: ['ADMIN', 'EMPLOYEE'], requiresExecutive: true }
    ]
  },
  {
    group: 'Attendance Management',
    items: [
      { id: 'attendance', label: 'Attendance & Roster', icon: <Clock size={18} />, roles: ['ADMIN'], moduleId: 'attendance_management' }
    ]
  },
];

// These hubs provide their own fixed header/navigation and scrollable content.
const FIXED_WORKSPACES: Screen[] = ['attendance', 'eim', 'self_service', 'leave-management',
  'performance', 'reporting-hierarchy', 'employee-information', 'dashboard',
  'team-attendance', 'executive-request-center'];

export default function UnifiedLayout({ currentScreen, onNavigate, children }: UnifiedLayoutProps) {
  const { user, logout } = useAuth();
  const [isCompact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches);
  const [isSidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia('(max-width: 760px)').matches);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(NAV_STRUCTURE.map(g => g.group));
  const [performanceExpanded, setPerformanceExpanded] = useState(() => window.location.pathname === '/performance');
  const [performanceSections, setPerformanceSections] = useState<Section[] | null>(null);
  const [performanceLoadError, setPerformanceLoadError] = useState(false);
  const [performanceActive, setPerformanceActive] = useState<Section>(() => performanceSectionFromHash(window.location.hash));

  useEffect(() => {
    const sync = () => setPerformanceActive(performanceSectionFromHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => {
    if (!performanceExpanded || !user) return;
    let active = true;
    setPerformanceLoadError(false);
    performanceApi.workspace().then(data => { if (active) setPerformanceSections(sectionsFor(data)); })
      .catch(() => { if (active) setPerformanceLoadError(true); });
    return () => { active = false; };
  }, [performanceExpanded, user?.id]);
  const openPerformanceSection = (section: Section) => {
    const hash = performanceHash(section);
    window.history.pushState({}, '', `/performance#${hash}`);
    setPerformanceActive(section);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    onNavigate('performance');
    if (isCompact) setSidebarOpen(false);
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const sync = () => {
      setCompact(media.matches);
      setSidebarOpen(!media.matches);
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<MemberData[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      usersApi.list().then(res => setAllMembers(res.data.data)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim() === '' ? [] : allMembers.filter(m => {
    const onboardingName = m.onboardingProfile ? `${m.onboardingProfile.firstName} ${m.onboardingProfile.lastName || ''}`.trim().toLowerCase() : '';
    const nameToMatch = (m.name || '').toLowerCase() || onboardingName;
    return (nameToMatch.includes(searchQuery.toLowerCase()) || (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())) && m.isActive === true;
  });

  if (!user) return <>{children}</>;

  if (user.role === 'CANDIDATE') {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md border-b border-white shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-md shadow-blue-600/20">PH</div>
            <div className="flex flex-col">
              <span className="font-black text-slate-800 text-sm leading-none">Peoples Management</span>
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Onboarding</span>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  // ── Sidebar item visibility logic ──────────────────────────────────────────
  const isItemVisible = (item: any) => {
    if (!user) return false;
    if (item.id === 'assistant-admin') return user.role === 'SUPER_ADMIN';
    if (item.id === 'reporting-hierarchy') return ['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'].includes(user.role);

    // Self-service individual performance items are not applicable to Super Admin or CEO / Executive
    const isPersonalSelfServiceItem = [
      'self_service'
    ].includes(item.id);

    if (isPersonalSelfServiceItem && (user.role === 'SUPER_ADMIN' || Boolean((user as any).isExecutive))) {
      return false;
    }

    // alwaysVisible override (for regular employees and managers)
    if (item.alwaysVisible) {
      return true;
    }

    // SUPER_ADMIN sees everything else
    if (user.role === 'SUPER_ADMIN') return true;

    // A CEO/Owner is an executive reader across the organization, even though
    // their login is still stored as an employee account in the auth table.
    if ((user as any).isExecutive) return item.id !== 'access-control';

    // Access Control: SUPER_ADMIN only
    if (item.id === 'access-control') return false;

    // Special flags (executive / manager)
    if (item.requiresExecutive) {
      return Boolean((user as any).isExecutive || user.role === 'ADMIN');
    }
    if (item.requiresManager) {
      return Boolean((user as any).isManager || user.role === 'ADMIN');
    }

    const perms: any[] = (user as any).permissions || [];
    if (user.role === 'EMPLOYEE') {
      if (['assistant', 'self_service'].includes(item.id)) return true;
      if (['leave-management', 'supervisor', 'team-attendance', 'reporting-hierarchy'].includes(item.id) && (user as any).isManager) return true;
      return false; // Strictly limit to requested modules
    }

    // ADMIN role
    if (user.role === 'ADMIN') {
      if (!item.moduleId) {
        // Items with no moduleId use roles array
        return item.roles?.includes('ADMIN') ?? false;
      }
      if (perms.length > 0) {
        // Permissions explicitly configured — respect them
        const p = perms.find((p: any) => p.moduleId === item.moduleId);
        if (p) return Boolean(p.moduleAccess) && Boolean(p.canView);
        return false; // module not in their permissions
      }
      // No permissions configured yet → show all ADMIN role items
      return item.roles?.includes('ADMIN') ?? false;
    }

    return false;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {isCompact && isSidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-900/35" />}
      {/* ─── SIDEBAR ─────────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: isCompact ? (isSidebarOpen ? 280 : 0) : (isSidebarOpen ? 280 : 80) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`${isCompact ? 'fixed inset-y-0 left-0 my-4 ml-4' : 'relative m-4'} ${isCompact && !isSidebarOpen ? 'invisible pointer-events-none' : ''} z-50 flex flex-col glass border-r border-white/50 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden`}
      >
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/50 bg-white/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20 flex-shrink-0">
              PH
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col whitespace-nowrap">
                  <span className="font-black text-slate-800 text-lg leading-none">Peoples Management</span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">HR Platform</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-hide">
          {NAV_STRUCTURE.map((group, idx) => {
            const visibleItems = group.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;

            const isGroupOpen = expandedGroups.includes(group.group);
            const toggleGroup = () =>
              setExpandedGroups(prev =>
                prev.includes(group.group) ? prev.filter(g => g !== group.group) : [...prev, group.group]
              );

            return (
              <div key={idx} className="space-y-1">
                {isSidebarOpen && (
                  <button onClick={toggleGroup} className="w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg hover:bg-slate-200/50 transition-colors group/header">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/header:text-slate-600">{group.group}</h4>
                    <ChevronRight size={14} className={`text-slate-400 transition-transform ${isGroupOpen ? 'rotate-90' : ''}`} />
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {(isGroupOpen || !isSidebarOpen) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {visibleItems.map(item => {
                        const isActive = currentScreen === item.id;
                        if (item.id === 'performance') return <div key="performance" className="space-y-1">
                          <button
                            type="button"
                            onClick={() => { setPerformanceExpanded(value => !value); if (!isSidebarOpen) setSidebarOpen(true); }}
                            aria-expanded={performanceExpanded}
                            aria-controls="readyhr-performance-submodules"
                            title={!isSidebarOpen ? 'Performance' : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'}`}
                          >
                            <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                            {isSidebarOpen && <><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-bold">{item.label}</span><ChevronRight size={15} className={`shrink-0 transition-transform ${performanceExpanded ? 'rotate-90' : ''}`} /></>}
                          </button>
                          {performanceExpanded && isSidebarOpen && <nav id="readyhr-performance-submodules" aria-label="Performance submodules" className="ml-3 max-h-[55vh] space-y-0.5 overflow-y-auto border-l border-blue-100 pl-2 pr-1">
                            {performanceLoadError && <p role="alert" className="px-2 py-2 text-xs text-rose-600">Could not load Performance access. Close and reopen this menu to retry.</p>}
                            {!performanceSections && !performanceLoadError && <p className="px-2 py-2 text-xs text-slate-500">Loading submodules…</p>}
                            {performanceNavigation.filter(link => performanceSections?.includes(link.id)).map(link => <button
                              key={link.id} type="button" onClick={() => openPerformanceSection(link.id)}
                              aria-current={isActive && performanceActive === link.id ? 'page' : undefined}
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${isActive && performanceActive === link.id ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-white hover:text-blue-700'}`}
                            ><link.icon size={15} className="shrink-0"/><span className="min-w-0">{link.label}</span></button>)}
                          </nav>}
                        </div>;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { onNavigate(item.id as Screen); if (isCompact) setSidebarOpen(false); }}
                            title={!isSidebarOpen ? item.label : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group ${
                              isActive ? 'text-blue-700' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                            }`}
                          >
                            {isActive && (
                              <motion.div layoutId="globalNavBg" className="absolute inset-0 bg-white shadow-sm border border-slate-100/50 rounded-xl" style={{ zIndex: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                            )}
                            <span className={`relative z-10 flex items-center justify-center ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                              {item.icon}
                            </span>
                            <AnimatePresence>
                              {isSidebarOpen && (
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 text-sm font-bold whitespace-nowrap">
                                  {item.label}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/50 bg-white/30 backdrop-blur-md">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white flex-shrink-0 overflow-hidden shadow-sm">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0D8ABC&color=fff`} alt="User" className="w-full h-full object-cover" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{user.role}</p>
              </div>
            )}
            {isSidebarOpen && (
              <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Log Out">
                <LogOut size={16} />
              </button>
            )}
          </div>
          {!isSidebarOpen && (
            <button onClick={logout} className="w-full mt-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex justify-center">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative bg-slate-50" data-testid="workspace-main">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </div>

        <header className="sticky top-0 z-30 shrink-0 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 shadow-sm transition-colors"
          >
            <motion.div animate={{ rotate: isSidebarOpen ? 180 : 0 }}>
              <ChevronRight size={18} />
            </motion.div>
          </button>
        </header>

        {FIXED_WORKSPACES.includes(currentScreen)
          ? <div className="workspace-frame relative" data-testid="workspace-module">{children}</div>
          : <WorkspaceScrollArea resetKey={currentScreen} className="relative pb-8" label="Workspace content">{children}</WorkspaceScrollArea>}
      </main>
    </div>
  );
}
