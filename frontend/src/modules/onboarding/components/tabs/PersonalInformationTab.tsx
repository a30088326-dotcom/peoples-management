import { useState, useEffect } from 'react';
import { eimApi } from '../../../../lib/api/eimApi';
import { User } from 'lucide-react';
import Field from '../Field';

export default function PersonalInformationTab({ form, setF, errors }: any) {
  const [genders, setGenders] = useState<any[]>([]);
  const [nationalities, setNationalities] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState('');

  const loadOptions = async () => {
      setLoadingOptions(true);
      setOptionsError('');
      try {
        const [gRes, nRes] = await Promise.all([
          eimApi.getGenders(),
          eimApi.getNationalities()
        ]);
        const activeGenders = (gRes.data?.data || []).filter((g: any) => g.isActive !== false && g.isActive !== 0);
        const activeNationalities = (nRes.data?.data || []).filter((n: any) => n.isActive !== false && n.isActive !== 0);
        setGenders(activeGenders);
        setNationalities(activeNationalities);
        if (!activeGenders.length || !activeNationalities.length) {
          setOptionsError('Gender or nationality options have not been configured. Ask HR to add active choices in EIM Admin, then retry.');
        }
      } catch (error) {
        setOptionsError('Could not load gender and nationality options. Retry to load them without losing your details.');
      } finally {
        setLoadingOptions(false);
      }
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: '#0f172a' }}>
        <User size={20} style={{ color: '#2563eb' }} /> Personal Details
      </h2>
      {optionsError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p>{optionsError}</p>
        <button type="button" onClick={() => void loadOptions()} disabled={loadingOptions} className="app-action mt-2 font-semibold underline">
          {loadingOptions ? 'Loading options…' : 'Retry options'}
        </button>
      </div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Field label="First Name" required error={errors.firstName}>
          <input className="input-field" value={form.firstName}
            onChange={e => setF('firstName', e.target.value)} />
        </Field>
        <Field label="Last Name" required error={errors.lastName}>
          <input className="input-field" value={form.lastName}
            onChange={e => setF('lastName', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Field label="Date of Birth" required error={errors.dateOfBirth}>
          <input type="date" className="input-field" value={form.dateOfBirth}
            onChange={e => setF('dateOfBirth', e.target.value)} />
        </Field>
        <Field label="Gender" required error={errors.gender}>
          <select className="input-field" value={form.gender} onChange={e => setF('gender', e.target.value)} required disabled={loadingOptions || genders.length === 0}>
            <option value="">{loadingOptions ? 'Loading genders…' : 'Select Gender'}</option>
            {genders.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nationality" error={errors.nationality}>
        <select className="input-field" value={form.nationality} onChange={e => setF('nationality', e.target.value)} disabled={loadingOptions || nationalities.length === 0}>
          <option value="">{loadingOptions ? 'Loading nationalities…' : 'Select Nationality'}</option>
          {nationalities.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
        </select>
      </Field>
      <div className="mt-4">
        <Field label="Address Line 1" required error={errors.addressLine1}>
          <input className="input-field" value={form.addressLine1}
            onChange={e => setF('addressLine1', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Field label="City" required error={errors.city}>
          <input className="input-field" value={form.city}
            onChange={e => setF('city', e.target.value)} />
        </Field>
        <Field label="Postal Code" error={errors.postalCode}>
          <input className="input-field" value={form.postalCode}
            onChange={e => setF('postalCode', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}
