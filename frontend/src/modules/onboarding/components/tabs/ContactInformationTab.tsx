import { Phone } from 'lucide-react';
import Field from '../Field';

export default function ContactInformationTab({ form, setF, errors }: any) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: '#0f172a' }}>
        <Phone size={20} style={{ color: '#2563eb' }} /> Contact Details
      </h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Phone Number" required error={errors.phoneNumber}>
          <input className="input-field" value={form.phoneNumber}
            onChange={e => setF('phoneNumber', e.target.value)} />
        </Field>
        <Field label="Alternate Phone" error={errors.alternatePhone}>
          <input className="input-field" value={form.alternatePhone}
            onChange={e => setF('alternatePhone', e.target.value)} />
        </Field>
      </div>
      <Field label="LinkedIn Profile" error={errors.linkedIn}>
        <input className="input-field" value={form.linkedIn}
          onChange={e => setF('linkedIn', e.target.value)} />
      </Field>

      <div className="mt-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Emergency Contact</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Full Name" required error={errors.emergencyContactName}>
            <input className="input-field" value={form.emergencyContactName}
              onChange={e => setF('emergencyContactName', e.target.value)} />
          </Field>
          <Field label="Relationship" required error={errors.emergencyContactRelation}>
            <select className="input-field" value={form.emergencyContactRelation} onChange={e => setF('emergencyContactRelation', e.target.value)} required>
              <option value="">Select Relationship</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Emergency Phone" required error={errors.emergencyContactPhone}>
          <input className="input-field" value={form.emergencyContactPhone}
            onChange={e => setF('emergencyContactPhone', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}
