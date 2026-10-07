import React from 'react';
import { useProfileRequest } from './ProfileRequestForm';
import { CreditCard, FileCheck, Plus, Edit2, ShieldAlert, Lock, ShieldCheck } from 'lucide-react';

export default function ProfileSensitive({ employee, loading }: { employee: any, loading: boolean }) {
  const request=useProfileRequest();
  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-24 bg-slate-100 rounded-2xl"></div>
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  if (!employee) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-lg font-bold text-slate-700 mb-2">No Employee Profile Found</h3>
      <p className="text-sm text-slate-500">Your employee profile hasn't been set up yet. Please contact HR.</p>
    </div>;
  }

  const bankAccounts = employee?.bankDetails ? employee.bankDetails.map((acc: any) => ({
    id: acc.id,
    bankName: acc.bankName || 'Bank Name',
    branch: acc.branch || acc.branchName || 'Branch',
    accNumber: acc.accountNo || acc.accountNumber || 'N/A',
    accName: acc.accountHolderName || employee?.personalDetails?.fullName || 'N/A',
    status: acc.isActive ? 'Active' : 'Inactive'
  })) : [];

  const documents = [];
  let docId = 1;
  if (employee?.personalDetails?.passportNo) {
    documents.push({
      id: docId++,
      type: 'Passport',
      number: employee.personalDetails.passportNo,
      country: employee.personalDetails.nationality || 'Sri Lanka',
      expiry: 'N/A',
      status: 'Verified'
    });
  }
  if (employee?.personalDetails?.nicNo) {
    documents.push({
      id: docId++,
      type: 'National Identity Card',
      number: employee.personalDetails.nicNo,
      country: employee.personalDetails.nationality || 'Sri Lanka',
      expiry: 'N/A',
      status: 'Verified'
    });
  }
  
  // also add from otherDetails if any
  const otherDocs = employee?.otherDetails?.documents || [];
  otherDocs.forEach((d: any) => {
    documents.push({
      id: docId++,
      type: d.type || 'Document',
      number: d.number || 'N/A',
      country: d.country || 'N/A',
      expiry: d.expiry || 'N/A',
      status: d.status || 'Verified'
    });
  });

  return (
    <div className="space-y-6">
      
      {/* Disclaimer / Notice */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-4 items-start">
        <ShieldAlert size={24} className="text-amber-500 shrink-0" />
        <div>
          <h4 className="font-bold text-amber-800">Sensitive Information Control</h4>
          <p className="text-sm text-amber-700 mt-1">
            Updates to Bank Information and Identification Documents require reporting manager approval before taking effect.
            Once submitted, the record will enter a "Pending Approval" state.
          </p>
        </div>
      </div>

      {/* Bank Information */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-500" /> Bank Information
          </h3>
          <button onClick={()=>request({section:'bank',operation:'add',values:{accountType:'Savings',currency:'LKR',accountHolderName:employee.personalDetails?.fullName}})} className="btn-primary gap-2 text-sm">
            <Plus size={16} /> Add Account
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map((acc: any) => (
            <div key={acc.id} className="p-5 rounded-2xl border border-slate-200 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 shadow-sm">
              <div className="absolute top-0 right-0 p-3">
                <ShieldCheck size={24} className="text-emerald-500 opacity-20" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-lg text-slate-800 tracking-tight">{acc.bankName}</h4>
                  <p className="text-sm font-medium text-slate-500">{acc.branch} Branch</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${acc.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {acc.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Number</p>
                  <p className="font-mono text-lg font-medium tracking-widest text-slate-700">{acc.accNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Holder</p>
                  <p className="font-medium text-slate-800 uppercase">{acc.accName}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={()=>{const original=employee.bankDetails.find((v:any)=>v.id===acc.id);request({section:'bank',operation:acc.id?'update':'add',itemId:acc.id,values:{...original,accountHolderName:acc.accName,accountNo:acc.accNumber,branch:original.branch||original.branchName}});}} className="btn-secondary gap-2 text-xs">
                  <Edit2 size={14} /> Request Change
                </button>
              </div>
            </div>
          ))}
          {bankAccounts.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-4">No bank accounts registered.</div>
          )}
        </div>
      </div>

      {/* Identification Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileCheck size={20} className="text-indigo-500" /> Passport & ID
          </h3>
          <button onClick={()=>request({section:'identification',operation:'update',values:employee.personalDetails})} className="btn-primary gap-2 text-sm bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Add Document
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Document Type</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Number</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Country</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{doc.type}</td>
                  <td className="p-4 font-mono text-slate-600">{doc.number}</td>
                  <td className="p-4 text-slate-600">{doc.country}</td>
                  <td className="p-4 text-slate-600">{doc.expiry}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${doc.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} flex items-center gap-1 w-max`}>
                      <Lock size={12} /> {doc.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>{window.location.search='?profileSection=documents';}} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors" title="View uploaded documents"><FileCheck size={16} /></button>
                      <button onClick={()=>request({section:'identification',operation:'update',values:employee.personalDetails})} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Edit Request"><Edit2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No identification documents added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
