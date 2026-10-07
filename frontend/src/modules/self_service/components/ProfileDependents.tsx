import React from 'react';
import { useProfileRequest } from './ProfileRequestForm';
import { Heart, Plus, Edit2, Trash2, PhoneCall } from 'lucide-react';

export default function ProfileDependents({ employee, loading }: { employee: any, loading: boolean }) {
  const request=useProfileRequest();
  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-48 bg-slate-100 rounded-2xl"></div>
      <div className="h-48 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  if (!employee) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      <Heart size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-lg font-bold text-slate-700 mb-2">No Employee Profile Found</h3>
      <p className="text-sm text-slate-500">Your employee profile hasn't been set up yet. Please contact HR.</p>
    </div>;
  }

  const dependents = employee?.payrollDetails?.dependents || [];
  let emergencyContacts = employee?.contactDetails?.emergencyContacts || [];
  if (employee?.contactDetails?.residential?.emergencyContacts) {
    emergencyContacts = employee.contactDetails.residential.emergencyContacts;
  }

  return (
    <div className="space-y-6">
      
      {/* Emergency Contacts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PhoneCall size={20} className="text-rose-500" /> Emergency Contacts
          </h3>
          <button onClick={()=>request({section:'emergency',operation:'add',values:{}})} className="btn-primary gap-2 text-sm bg-rose-600 hover:bg-rose-700">
            <Plus size={16} /> Add Contact
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts.map((contact: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-xl border ${contact.isPrimary ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'} flex justify-between items-start`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-800">{contact.name || 'Unknown Name'}</h4>
                    {contact.isPrimary && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">Primary</span>}
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{contact.relationship || 'Unspecified'}</p>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <PhoneCall size={14} className="text-slate-400" /> {contact.primaryPhone || contact.phone || contact.contactNo || contact.mobile || 'N/A'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button aria-label={`Request edit contact ${contact.name}`} onClick={()=>request({section:'emergency',operation:'update',itemId:contact.id,values:{...contact,primaryPhone:contact.primaryPhone||contact.phone||contact.mobile}})} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                  <button aria-label={`Request remove contact ${contact.name}`} onClick={()=>request({section:'emergency',operation:'remove',itemId:contact.id,values:contact})} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {emergencyContacts.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500">No emergency contacts added yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Dependents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Heart size={20} className="text-pink-500" /> Dependents
          </h3>
          <button onClick={()=>request({section:'dependents',operation:'add',values:{}})} className="btn-primary gap-2 text-sm">
            <Plus size={16} /> Add Dependent
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Relationship</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dependents.map((dep: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{dep.name || 'Unknown Name'}</td>
                  <td className="p-4 text-slate-600">{dep.relationship || 'Unspecified'}</td>
                  <td className="p-4 text-slate-600">{dep.dob || 'N/A'}</td>
                  <td className="p-4 text-slate-600">{dep.gender || 'N/A'}</td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>request({section:'dependents',operation:'update',itemId:dep.id,values:dep})} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Request edit dependent"><Edit2 size={16} /></button>
                      <button onClick={()=>request({section:'dependents',operation:'remove',itemId:dep.id,values:dep})} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Request remove dependent"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {dependents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No dependents added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
