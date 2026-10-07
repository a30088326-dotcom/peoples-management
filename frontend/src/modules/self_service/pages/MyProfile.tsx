import React, { useState } from 'react';
import { User, Heart, BriefcaseBusiness, Shield, FileText } from 'lucide-react';
import AttachmentsTab from '../../employee_information/components/tabs/AttachmentsTab';
import ProfileBasicInfo from '../components/ProfileBasicInfo';
import ProfileDependents from '../components/ProfileDependents';
import ProfileProfessional from '../components/ProfileProfessional';
import ProfileSensitive from '../components/ProfileSensitive';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';
import ProfileRequestForm, { ProfileRequestContext, type ProfileChange } from '../components/ProfileRequestForm';

export default function MyProfile({ employee, loading, children }: { employee: any, loading: boolean, children?: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState(new URLSearchParams(window.location.search).get('profileSection') === 'documents' ? 'documents' : 'basic');
  const [change,setChange]=useState<ProfileChange|null>(null),[notice,setNotice]=useState('');

  const sections = [
    { id: 'basic', label: 'Basic & Contact Info', icon: <User size={18} /> },
    { id: 'dependents', label: 'Emergency & Dependents', icon: <Heart size={18} /> },
    { id: 'professional', label: 'Professional Info', icon: <BriefcaseBusiness size={18} /> },
    { id: 'sensitive', label: 'Bank & Identification', icon: <Shield size={18} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
  ];

  return (
    <ProfileRequestContext.Provider value={setChange}><div className="flex flex-1 min-h-0 min-w-0 w-full max-w-7xl mx-auto flex-col lg:flex-row gap-4 lg:gap-8 overflow-hidden">
      {/* Sidebar Navigation for Profile */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Profile Sections</h2>
          </div>
          <nav aria-label="Profile sections" className="p-2 flex lg:block gap-1 overflow-x-auto lg:space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => setActiveSection(section.id)}
                className={`shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeSection === section.id 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`${activeSection === section.id ? 'text-blue-600' : 'text-slate-400'}`}>
                  {section.icon}
                </div>
                <span className="text-sm">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <WorkspaceScrollArea resetKey={activeSection} label="Profile section content" className="space-y-6">
        {notice&&<p role="status" className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-xl">{notice}</p>}
        {activeSection === 'basic' && <ProfileBasicInfo employee={employee} loading={loading} />}
        {activeSection === 'dependents' && <ProfileDependents employee={employee} loading={loading} />}
        {activeSection === 'professional' && <ProfileProfessional employee={employee} loading={loading} />}
        {activeSection === 'sensitive' && <ProfileSensitive employee={employee} loading={loading} />}
        {activeSection === 'documents' && <AttachmentsTab employeeId={employee?.id} />}
        {children}
      </WorkspaceScrollArea>
    </div>{change&&<ProfileRequestForm key={`${change.section}-${change.itemId||'new'}`} change={change} onClose={()=>setChange(null)} onSubmitted={()=>{setChange(null);setNotice('Request sent to your reporting manager. Track it in My Requests.');}}/>}</ProfileRequestContext.Provider>
  );
}
