import React from 'react';
import { useProfileRequest } from './ProfileRequestForm';
import { GraduationCap, Briefcase, BookOpen, FileCheck, Plus, Edit2, Trash2, Download } from 'lucide-react';

export default function ProfileProfessional({ employee, loading }: { employee: any, loading: boolean }) {
  const request=useProfileRequest();
  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-48 bg-slate-100 rounded-2xl"></div>
      <div className="h-48 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  if (!employee) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-lg font-bold text-slate-700 mb-2">No Employee Profile Found</h3>
      <p className="text-sm text-slate-500">Your employee profile hasn't been set up yet. Please contact HR.</p>
    </div>;
  }

  const qualifications = employee?.otherDetails?.qualifications || [];
  const workExperience = employee?.otherDetails?.workExperience || [];
  const memberships = employee?.otherDetails?.memberships || [];
  const expertise = employee?.otherDetails?.expertise || [];

  return (
    <div className="space-y-6">
      
      {/* Qualifications */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap size={20} className="text-blue-500" /> Qualifications
          </h3>
          <button onClick={()=>request({section:'qualifications',operation:'add',values:{}})} className="btn-primary gap-2 text-sm">
            <Plus size={16} /> Add Qualification
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qualification</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Institute</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Year</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {qualifications.map((qual: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-slate-800">{qual.qualification || qual.title || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{qual.type}</p>
                  </td>
                  <td className="p-4 text-slate-600">{qual.institute}</td>
                  <td className="p-4 text-slate-600">{qual.year}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      qual.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {qual.status || 'Verified'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button disabled={!qual.certificateUrl} onClick={()=>{if(qual.certificateUrl)window.open(qual.certificateUrl,'_blank','noopener,noreferrer');}} className="p-1.5 text-slate-400 disabled:opacity-30" title={qual.certificateUrl?'Download Certificate':'No certificate attached; upload via Documents'}><Download size={16} /></button>
                      <button onClick={()=>request({section:'qualifications',operation:'update',itemId:qual.id,values:qual})} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Request edit qualification"><Edit2 size={16} /></button>
                      <button onClick={()=>request({section:'qualifications',operation:'remove',itemId:qual.id,values:qual})} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Request remove qualification"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {qualifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No qualifications added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-3 bg-blue-50/50 border-t border-slate-100 text-xs text-blue-600 font-medium text-center">
            Note: Adding or editing qualifications requires reporting manager approval.
          </div>
        </div>
      </div>

      {/* Work Experience */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-500" /> Work Experience
          </h3>
          <button onClick={()=>request({section:'workExperience',operation:'add',values:{}})} className="btn-primary gap-2 text-sm bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Add Experience
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {workExperience.map((exp: any, idx: number) => (
              <div key={idx} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active`}>
                {/* Timeline Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Briefcase size={16} />
                </div>
                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800">{exp.role || exp.title || 'Unknown Role'}</h4>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{exp.duration || 'N/A'}</span>
                  </div>
                  <p className="text-sm font-medium text-indigo-600 mb-2">{exp.company || 'Unknown Company'}</p>
                  <p className="text-xs text-slate-500">{exp.from || 'N/A'} to {exp.to || 'Present'}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                    <button aria-label="Request edit experience" onClick={()=>request({section:'workExperience',operation:'update',itemId:exp.id,values:exp})} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                    <button aria-label="Request remove experience" onClick={()=>request({section:'workExperience',operation:'remove',itemId:exp.id,values:exp})} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {workExperience.length === 0 && (
              <div className="text-center text-slate-500 py-8 relative z-10 bg-white">No work experience added yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expertise / Skills */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen size={20} className="text-purple-500" /> Expertise
            </h3>
            <button aria-label="Add expertise" onClick={()=>request({section:'expertise',operation:'add',values:{}})} className="btn-secondary p-1.5"><Plus size={16} /></button>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {expertise.map((exp: any, idx: number) => (
                <div key={idx} className="bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <div>
                    <p className="text-sm font-bold text-purple-800">{exp.skill || exp.name || 'Skill'}</p>
                    <p className="text-[10px] text-purple-600">{exp.domain || exp.category || 'General'}</p>
                  </div>
                </div>
              ))}
              {expertise.length === 0 && <span className="text-slate-500 text-sm">No expertise listed.</span>}
            </div>
          </div>
        </div>

        {/* Memberships */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileCheck size={20} className="text-teal-500" /> Memberships
            </h3>
            <button aria-label="Add membership" onClick={()=>request({section:'memberships',operation:'add',values:{}})} className="btn-secondary p-1.5"><Plus size={16} /></button>
          </div>
          
          <div className="p-4 space-y-3">
            {memberships.map((mem: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <FileCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{mem.organization || mem.name || 'Organization'}</h4>
                    <p className="text-xs text-slate-500">ID: {mem.number || mem.id || 'N/A'} • {mem.type || 'Member'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Valid Until</span>
                  <span className="text-sm font-medium text-slate-700">{mem.expiry || 'Lifetime'}</span>
                </div>
              </div>
            ))}
            {memberships.length === 0 && <div className="text-slate-500 text-sm text-center p-4">No memberships added.</div>}
          </div>
        </div>
      </div>

    </div>
  );
}
