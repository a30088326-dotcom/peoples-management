import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { eimApi } from '../../../../lib/api/eimApi';

export default function PayrollDetailsTab({ data, update }: { data: any, update: (d: any) => void }) {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      eimApi.getCurrencies(),
      eimApi.getRelationshipTypes()
    ]).then(([cRes, rRes]) => {
      setCurrencies(cRes.data?.data || []);
      setRelationshipTypes(rRes.data?.data || []);
    }).catch(e => console.error(e));
  }, []);
  
  const handleStatutoryChange = (field: string, value: string) => {
    update({ statutoryDetails: { ...data.statutoryDetails, [field]: value } });
  };

  const handleBankChange = (field: string, value: string | boolean) => {
    update({ bankDetails: { ...data.bankDetails, [field]: value } });
  };

  const handleSalaryChange = (field: string, value: string | number) => {
    update({ salaryDetails: { ...data.salaryDetails, [field]: value } });
  };

  const addDependent = () => {
    const current = data.dependents || [];
    update({ dependents: [...current, { name: '', relationship: '', dob: '', nic: '', contact: '', benefitEligibility: '', type: '', percentage: 0, effectiveFrom: '', effectiveTo: '' }] });
  };

  const updateDependent = (index: number, field: string, value: string | number) => {
    const current = [...(data.dependents || [])];
    current[index] = { ...current[index], [field]: value };
    update({ dependents: current });
  };

  const removeDependent = (index: number) => {
    const current = [...(data.dependents || [])];
    current.splice(index, 1);
    update({ dependents: current });
  };

  return (
    <div className="space-y-6">
      
      {/* Dependents and Nominees */}
      <div className="border border-slate-200 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-slate-700 text-sm">Dependents and Nominees</h4>
          <button type="button" onClick={addDependent} className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
            <Plus size={14} /> Add
          </button>
        </div>
        
        <div className="space-y-4">
          {(data.dependents || []).map((dep: any, idx: number) => (
            <div key={idx} className="p-4 border border-slate-100 bg-slate-50 rounded-lg relative">
              <button type="button" onClick={() => removeDependent(idx)} className="absolute top-3 right-3 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Name</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={dep.name} onChange={e => updateDependent(idx, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Relationship</label>
                  <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={dep.relationship} onChange={e => updateDependent(idx, 'relationship', e.target.value)}>
                    <option value="">Select Relationship</option>
                    {relationshipTypes.map(rt => <option key={rt.id} value={rt.name}>{rt.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Date of Birth</label>
                  <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={dep.dob} onChange={e => updateDependent(idx, 'dob', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">NIC / Passport</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={dep.nic} onChange={e => updateDependent(idx, 'nic', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Contact Details</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={dep.contact} onChange={e => updateDependent(idx, 'contact', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Benefit Eligibility</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Medical" value={dep.benefitEligibility} onChange={e => updateDependent(idx, 'benefitEligibility', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Nominee Type</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={dep.type} onChange={e => updateDependent(idx, 'type', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Nominee Percentage (%)</label>
                  <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={dep.percentage} onChange={e => updateDependent(idx, 'percentage', parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
          {(!data.dependents || data.dependents.length === 0) && (
            <div className="text-sm text-slate-400 italic text-center py-4">No dependents or nominees added.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statutory Details */}
        <div className="border border-slate-200 p-4 rounded-xl">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Statutory Details</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Applicable Statute / EPF/ETF</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.statutoryDetails?.epfNo || ''} onChange={e => handleStatutoryChange('epfNo', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Tax Identifier (TIN)</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.statutoryDetails?.taxId || ''} onChange={e => handleStatutoryChange('taxId', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Work Permit Details</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.statutoryDetails?.workPermit || ''} onChange={e => handleStatutoryChange('workPermit', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Salary Details */}
        <div className="border border-slate-200 p-4 rounded-xl">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Salary Details</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Basic Salary</label>
                <input type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={data.salaryDetails?.basicSalary || 0} onChange={e => handleSalaryChange('basicSalary', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Currency</label>
                <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data.salaryDetails?.currency || 'LKR'} onChange={e => handleSalaryChange('currency', e.target.value)}>
                  <option value="">Select Currency</option>
                  {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Effective Date</label>
              <input type="date" className="w-full p-2 border border-slate-200 rounded-lg" value={data.salaryDetails?.effectiveDate || ''} onChange={e => handleSalaryChange('effectiveDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Bank Account Details */}
        <div className="border border-slate-200 p-4 rounded-xl col-span-1 md:col-span-2">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Bank Account Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Bank</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.bank || ''} onChange={e => handleBankChange('bank', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Branch</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.branch || ''} onChange={e => handleBankChange('branch', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Account Name</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.accountName || ''} onChange={e => handleBankChange('accountName', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Account Number</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.accountNumber || ''} onChange={e => handleBankChange('accountNumber', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Account Type</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.accountType || ''} onChange={e => handleBankChange('accountType', e.target.value)}>
                <option value="">Select...</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Payment Allocation (%)</label>
              <input type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.paymentAllocation || 100} onChange={e => handleBankChange('paymentAllocation', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Priority</label>
              <input type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.priority || 1} onChange={e => handleBankChange('priority', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Effective From</label>
              <input type="date" className="w-full p-2 border border-slate-200 rounded-lg" value={data.bankDetails?.effectiveFrom || ''} onChange={e => handleBankChange('effectiveFrom', e.target.value)} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={data.bankDetails?.isActive !== false} onChange={e => handleBankChange('isActive', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-slate-700">Active Account</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
