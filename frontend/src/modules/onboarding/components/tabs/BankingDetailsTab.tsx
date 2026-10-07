import React from 'react';
import { CreditCard } from 'lucide-react';
import Field from '../Field';

export default function BankingDetailsTab({ form, setF, errors }: any) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: '#0f172a' }}>
        <CreditCard size={20} style={{ color: '#2563eb' }} /> Bank & Payment Details
      </h2>
      <div className="p-4 rounded-2xl mb-5" style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
        <p className="text-xs text-amber-700 leading-relaxed">
          🔒 Your bank information is encrypted securely and is only used for payroll processing.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Bank Name" required error={errors.bankName}>
          <input className="input-field" value={form.bankName}
            onChange={e => setF('bankName', e.target.value)} />
        </Field>
        <Field label="Account Type" error={errors.accountType}>
          <select className="input-field" value={form.accountType}
            onChange={e => setF('accountType', e.target.value)}>
            <option value="SAVINGS">Savings</option><option value="CHECKING">Checking</option>
          </select>
        </Field>
      </div>
      <Field label="Account Holder Name" required error={errors.accountHolderName}>
        <input className="input-field" value={form.accountHolderName}
          onChange={e => setF('accountHolderName', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label="Account Number" required error={errors.accountNumber}>
          <input className="input-field" value={form.accountNumber}
            onChange={e => setF('accountNumber', e.target.value)} />
        </Field>
      </div>
      <Field label="Currency" error={errors.currency}>
        <select className="input-field mt-4" value={form.currency}
          onChange={e => setF('currency', e.target.value)}>
          <option value="USD">USD - US Dollar</option>
          <option value="LKR">LKR - Sri Lankan Rupee</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
        </select>
      </Field>
    </div>
  );
}
