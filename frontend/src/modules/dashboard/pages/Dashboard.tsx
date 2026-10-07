import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Filter, RefreshCw } from 'lucide-react';
import { usersApi, invitesApi } from '../../../lib/api';
import type { TeamMember, PendingInvite } from '../../../types';
import MetricsCards from '../components/MetricsCards';
import DashboardTabs from '../components/DashboardTabs';
import MembersTable from '../components/MembersTable';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

import { useAuth } from '../../../context/AuthContext';
import type { Screen } from '../../../types';
import OrganizationOverview from '../components/OrganizationOverview';

type TabId = 'active' | 'pending' | 'onboarding' | 'invites';

export default function Dashboard({onNavigate}:{onNavigate?:(screen:Screen)=>void}) {
  const {isAdmin}=useAuth();
  const [error,setError]=useState('');
  const [department,setDepartment]=useState('');
  const [refreshKey,setRefreshKey]=useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeMembers, setActiveMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        usersApi.list({limit:500}),
        isAdmin ? invitesApi.list() : Promise.resolve({data:{data:[]}})
      ]);
      
      const members = usersRes.data.data.map((u: any) => ({
        id: u.id,
        name: u.name || (u.onboardingProfile ? `${u.onboardingProfile.firstName} ${u.onboardingProfile.lastName}` : 'Unnamed'),
        email: u.email,
        role: u.role,
        designation: u.employee?.designation || u.onboardingProfile?.designation || u.receivedInvite?.designation || '',
        team: u.employee?.department || u.onboardingProfile?.department || u.receivedInvite?.team || '',
        employmentType: u.employee?.employmentType || u.receivedInvite?.employmentType || u.onboardingProfile?.employmentType || '',
        joinedDate: u.employee?.dateJoined || u.createdAt,
        avatarInitials: (u.name || u.email).substring(0, 2).toUpperCase(),
        avatarColor: '#0D8ABC', // Could be dynamic
        status: (['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(u.role) ? 'Active' : (u.role === 'EMPLOYEE' ? (u.employee ? 'Active' : 'Pending') : 'Onboarding')) as 'Active' | 'Pending' | 'Onboarding'
      }));
      
      setActiveMembers(members.filter((m:any)=>usersRes.data.data.find((u:any)=>u.id===m.id)?.isActive));
      setError(''); setRefreshKey(k=>k+1);
      setInvites(invitesRes.data.data as unknown as PendingInvite[]);
    } catch (err) {
      setError('Unable to load people. Please refresh and try again.');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuccess = (id: string) => {
    setActiveMembers(prev => prev.filter(m => m.id !== id));
    setInvites(prev => prev.filter(i => i.id !== id));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const counts = {
    active: activeMembers.filter(m => m.status === 'Active').length,
    pending: activeMembers.filter(m => m.status === 'Pending').length,
    onboarding: activeMembers.filter(m => m.status === 'Onboarding').length,
    invites: invites.filter(i => i.status === 'PENDING').length
  };

  // Calculate unique teams
  const uniqueTeams = new Set(activeMembers.map(m => m.team).filter(Boolean));

  return (
    <div className="workspace-frame p-4 sm:p-8 w-full max-w-7xl mx-auto gap-6">
      
      {/* ─── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap gap-4 items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">People Management</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage your team and invitations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button disabled={!isAdmin} onClick={()=>onNavigate?.("employee-information")} className="disabled:hidden px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
            <UserPlus size={18} />
            Add People
          </button>
        </div>
      </div>

      <WorkspaceScrollArea label="Dashboard content"><div className="space-y-8">
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <OrganizationOverview onNavigate={onNavigate} refreshKey={refreshKey}/>

      {/* ─── METRICS CARDS ────────────────────────────────────────────────────── */}
      <MetricsCards 
        totalMembers={counts.active}
        pendingInvites={counts.invites}
        onboarded={counts.pending}
        teams={uniqueTeams.size}
      />

      {/* ─── DATA TABLE SECTION ───────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <div className="flex flex-wrap gap-3 items-center justify-between px-6 pt-2">
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:font-medium placeholder:text-slate-400"
              />
            </div>
            <select aria-label="Filter department" value={department} onChange={e=>setDepartment(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-sm"><option value="">All departments</option>{[...uniqueTeams].sort().map(d=><option key={d}>{d}</option>)}</select>
          </div>
        </div>

        <WorkspaceScrollArea resetKey={activeTab} label="Dashboard people table" className="h-[60vh] !flex-none">
        <MembersTable 
          activeTab={activeTab}
          activeMembers={activeMembers.filter(m=>!department||m.team===department)}
          invites={invites}
          searchQuery={searchQuery}
          onRefresh={fetchData}
          onDeleteSuccess={handleDeleteSuccess}
        />
        </WorkspaceScrollArea>
      </div>
      </div></WorkspaceScrollArea>
    </div>
  );
}
