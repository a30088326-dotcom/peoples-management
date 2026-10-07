import React, { createContext, useContext, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../../lib/api/client';

export const profileRequestApi = {
  my:()=>api.get('/api/employee_information/audit/profile-requests/my'),
  team:()=>api.get('/api/employee_information/audit/profile-requests/team'),
  submit:(body:any)=>api.post('/api/employee_information/audit/profile-requests',body),
  cancel:(id:string)=>api.patch(`/api/employee_information/audit/profile-requests/${id}/cancel`),
  resolve:(id:string,action:string,reason:string)=>api.patch(`/api/employee_information/audit/profile-requests/${id}/resolve`,{action,reason})
};
export type ProfileChange = {section:string,operation:'add'|'update'|'remove',itemId?:string,values:any};
export const ProfileRequestContext = createContext<(change:ProfileChange)=>void>(()=>{});
export const useProfileRequest = ()=>useContext(ProfileRequestContext);
export const profileFields:Record<string,[string,string,string?][]> = {
  basic:[['firstName','First name'],['lastName','Last name'],['fullName','Full name'],['title','Title'],['gender','Gender'],['dob','Date of birth','date'],['maritalStatus','Marital status'],['nationality','Nationality']],
  contact:[['address','Permanent address'],['city','City'],['country','Country'],['mobile','Personal mobile'],['telephone','Home telephone'],['email','Personal email','email'],['workingAddress','Working address']],
  emergency:[['name','Full name'],['relationship','Relationship','relationship'],['primaryPhone','Emergency phone']],
  dependents:[['name','Full name'],['relationship','Relationship'],['dob','Date of birth','date'],['gender','Gender']],
  qualifications:[['qualification','Qualification'],['type','Type'],['institute','Institute'],['year','Year']],
  workExperience:[['role','Role'],['company','Company'],['from','From','date'],['to','To','date']],
  expertise:[['skill','Skill'],['domain','Domain']],
  memberships:[['organization','Organization'],['number','Membership number'],['type','Type'],['expiry','Expiry','date']],
  bank:[['bankName','Bank name'],['branch','Branch'],['accountNo','Account number'],['accountHolderName','Account holder'],['accountType','Account type','accountType'],['currency','Currency']],
  identification:[['nicNo','National ID / NIC'],['passportNo','Passport number']]
};
export default function ProfileRequestForm({change,onClose,onSubmitted}:{change:ProfileChange,onClose:()=>void,onSubmitted:()=>void}) {
  const fields=profileFields[change.section];
  const [values,setValues]=useState(()=>Object.fromEntries(fields.map(([key])=>[key,change.values?.[key]||''])));
  const [reason,setReason]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  return <div className="fixed inset-0 z-[250] bg-slate-900/50 flex items-center justify-center p-4">
    <form role="dialog" aria-modal="true" aria-labelledby="profile-request-title" className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{await profileRequestApi.submit({...change,values:change.operation==='remove'?{}:values,reason});onSubmitted();}catch(err:any){setError(err.response?.data?.message||'Could not submit the request. Please retry.');}finally{setSaving(false);}}}>
      <div className="p-6 border-b flex justify-between"><h2 id="profile-request-title" className="text-xl font-bold">Request profile change</h2><button type="button" aria-label="Close profile request" onClick={onClose} disabled={saving}><X size={20}/></button></div>
      <div className="p-6 overflow-y-auto space-y-4"><p className="text-sm text-slate-600">Your reporting manager will review this request. Your current profile stays unchanged until approval.</p>
        {error&&<p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
        {change.operation==='remove'?<p>Request removal of {change.values?.name||change.values?.qualification||change.values?.role||'this item'}?</p>:<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(([key,label,type])=><label key={key} className="text-sm font-medium">{label}{type==='relationship'||type==='accountType'?<select className="w-full mt-1 border rounded-xl p-3" value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})} required><option value="">Select {label.toLowerCase()}</option>{(type==='relationship'?['Father','Mother','Other']:['Savings','Current']).map(v=><option key={v}>{v}</option>)}</select>:<input className="w-full mt-1 border rounded-xl p-3" type={type||'text'} maxLength={255} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>}</label>)}</div>}
        <label className="block text-sm font-medium">Reason for change<textarea className="w-full mt-1 border rounded-xl p-3" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      </div><div className="p-6 border-t flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn-primary" disabled={saving}>{saving?'Submitting…':'Send to reporting manager'}</button></div>
    </form>
  </div>;
}
