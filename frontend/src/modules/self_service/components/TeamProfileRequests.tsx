import React, { useEffect, useState } from 'react';
import { profileRequestApi, profileFields } from './ProfileRequestForm';

export function ProfileChangeDetails({request}:{request:any}) {
  const payload=typeof request.dataPayload==='string'?JSON.parse(request.dataPayload):request.dataPayload;
  if(!payload)return null;
  const fields=profileFields[payload.section]||[];
  return <div className="space-y-3"><p className="font-bold capitalize">{payload.operation} · {payload.section}</p><p>{request.description}</p>
    {payload.operation==='remove'?<p>Remove: {payload.before?.name||payload.before?.qualification||payload.before?.role||'Selected item'}</p>:<table className="w-full text-sm text-left"><thead><tr><th>Field</th><th>Current at submission</th><th>Requested</th></tr></thead><tbody>{fields.map(([key,label])=><tr key={key} className="border-t"><td className="py-2">{label}</td><td>{String(payload.before?.[key]||'—')}</td><td className="font-medium">{String(payload.values?.[key]||'—')}</td></tr>)}</tbody></table>}
    <p className="text-sm text-slate-500">Assigned approver: {request.approverName||'Reporting manager'}</p>
    {request.rejectionReason&&<p className="text-rose-700">Decision note: {request.rejectionReason}</p>}
  </div>;
}
export default function TeamProfileRequests() {
  const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[review,setReview]=useState<any>(null),[reason,setReason]=useState(''),[saving,setSaving]=useState(false);
  const load=async()=>{try{setRows((await profileRequestApi.team()).data.data||[]);setError('');}catch(err:any){setError(err.response?.data?.message||'Unable to load profile requests.');}};
  useEffect(()=>{load();},[]);
  if(!rows.length&&!error)return null;
  return <section className="bg-white p-6 border rounded-2xl my-6"><h2 className="text-xl font-bold">Team profile requests</h2><p className="text-sm text-slate-500 mb-4">Requests assigned to you as reporting manager.</p>{error&&<p role="alert" className="text-red-700">{error} <button onClick={load}>Retry</button></p>}
    <div className="space-y-3">{rows.map(r=><div key={r.id} className="flex items-center gap-3 justify-between border rounded-xl p-4"><div><p className="font-semibold">{r.employeeName} · {r.title}</p><p className="text-sm text-slate-500">{r.status} · {new Date(r.createdAt).toLocaleDateString()}</p></div><button className="btn-secondary" onClick={()=>{setReview(r);setReason('');setError('');}}>{r.status==='PENDING'?'Review':'View'}</button></div>)}</div>
    {review&&<div className="fixed inset-0 z-[250] bg-slate-900/50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="Review profile request" className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4"><h2 className="text-xl font-bold">{review.employeeName} · Profile request</h2><ProfileChangeDetails request={review}/>{error&&<p role="alert" className="text-red-700">{error}</p>}{review.status==='PENDING'&&<label className="block text-sm">Decision note (required for rejection)<textarea className="w-full p-3 border rounded-xl" maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
      <div className="flex justify-end gap-3"><button className="btn-secondary" disabled={saving} onClick={()=>setReview(null)}>Close</button>{review.status==='PENDING'&&(['REJECTED','APPROVED'] as const).map(action=><button key={action} className={action==='APPROVED'?'btn-primary':'btn-secondary'} disabled={saving||(action==='REJECTED'&&!reason.trim())} onClick={async()=>{setSaving(true);try{await profileRequestApi.resolve(review.id,action,reason);setReview(null);await load();}catch(err:any){setError(err.response?.data?.message||'Could not process this request.');}finally{setSaving(false);}}}>{action==='APPROVED'?'Approve':'Reject'}</button>)}</div>
    </div></div>}
  </section>;
}
