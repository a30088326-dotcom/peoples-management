import { useState } from 'react';
import WorkspaceScrollArea from '../../components/WorkspaceScrollArea';
import { 
  Database, Building2, Briefcase, GraduationCap, Users,
  Sliders, History, Search} from 'lucide-react';
import type { Screen } from '../../types';
import EIMDashboard from './EIMDashboard';
import CompanyStructure from './components/CompanyStructure';
import WorkStructure from './components/WorkStructure';
import Classifications from './components/Classifications';
import Qualifications from './components/Qualifications';
import Benefits from './components/Benefits';
import Geography from './components/Geography';
import OtherMasterData from './components/OtherMasterData';
import DynamicFields from './components/DynamicFields';
import AuditHistory from './components/AuditHistory';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export default function EIMManagementHub({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    description: 'Company, locations, departments, cost centres and organization hierarchy',
  },
  {
    id: 'jobs',
    label: 'Jobs & Employment',
    icon: Briefcase,
    description: 'Designations, corporate titles, salary grades, employment types, employee groups and job profiles',
  },
  {
    id: 'employee-reference',
    label: 'Employee Reference',
    icon: Users,
    description: 'Titles, gender, marital status, nationality, religion, blood group and relationship types',
  },
  {
    id: 'qualifications',
    label: 'Qualifications & Skills',
    icon: GraduationCap,
    description: 'Qualification types, qualifications, classifications, subjects, languages and proficiency',
  },
  {
    id: 'system-reference',
    label: 'Benefits & System Reference',
    icon: Sliders,
    description: 'Benefits, currencies, attachment types, memberships and controlled system reference data',
  },
  {
    id: 'audit',
    label: 'Audit History',
    icon: History,
    description: 'Track all master-data changes',
  },
];



  const renderContent = () => {
    switch (activeTab) {
      case 'organization':
        return <CompanyStructure />;
      case 'jobs':
        return <WorkStructure />;
      case 'employee-reference':
        return <Classifications />;
      case 'qualifications':
        return <Qualifications />;
      case 'system-reference':
        return (
          <div className="space-y-6">
            <Benefits />
            <div className="border-t border-slate-200 pt-6">
              <Geography />
            </div>
            <div className="border-t border-slate-200 pt-6">
              <OtherMasterData />
            </div>
            <div className="border-t border-slate-200 pt-6">
              <DynamicFields />
            </div>
          </div>
        );
      case 'audit':
        return <AuditHistory />;
      default:
        return <EIMDashboard />;
    }
  };

  return (
    <div className="workspace-frame bg-[#F4F7FC]">
      {/* Header */}
      <div className="bg-white shrink-0 z-30 border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 min-h-20 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">EIM Administration</h1>
              <p className="text-sm text-slate-500">Employee Information Management & Master Data</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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

      <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-6 py-6 flex flex-col md:flex-row flex-1 min-h-0 gap-4 lg:gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-48 xl:w-64 shrink-0 min-h-0 overflow-auto">
          <div className="flex md:block gap-1 md:space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors group ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'text-slate-600 hover:bg-white hover:text-indigo-600'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <WorkspaceScrollArea resetKey={activeTab} label="EIM tab content">
            <div key={activeTab}>
              {renderContent()}
            </div>
        </WorkspaceScrollArea>
      </div>
    </div>
  );
}
