import { useState, useEffect } from 'react';
import { eimApi } from '../../../../lib/api/eimApi';

export default function PersonalDetailsTab({ data, update }: { data: any, update: (d: any) => void }) {
  const [eimData, setEimData] = useState({ 
    titles: [] as any[], genders: [] as any[], civilStatuses: [] as any[],
    nationalities: [] as any[], bloodGroups: [] as any[], religions: [] as any[]
  });
  useEffect(() => {
    Promise.all([
      eimApi.getEmployeeTitles(), eimApi.getGenders(), eimApi.getMaritalStatuses(),
      eimApi.getNationalities(), eimApi.getBloodGroups(), eimApi.getReligions()
    ])
      .then(([tRes, gRes, mRes, nRes, bRes, rRes]) => setEimData({ 
        titles: tRes.data?.data || [], genders: gRes.data?.data || [], civilStatuses: mRes.data?.data || [],
        nationalities: nRes.data?.data || [], bloodGroups: bRes.data?.data || [], religions: rRes.data?.data || []
      }))
      .catch(e => console.error(e));
  }, []);

  const handleChange = (field: string, value: string) => {
    update({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Title</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg" value={data?.title || ''} onChange={e => handleChange('title', e.target.value)}>
            <option value="">Select</option>
            {eimData.titles.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Legal First Name *</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Legal Middle Name(s)</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.middleName || ''} onChange={e => handleChange('middleName', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Legal Last Name / Surname *</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Preferred / Calling Name *</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.preferredName || ''} onChange={e => handleChange('preferredName', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Full Name (System Generated)</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100" value={data?.fullName || ''} onChange={e => handleChange('fullName', e.target.value)} placeholder="Will be generated automatically" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Date of Birth *</label>
          <input type="date" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.dob || ''} onChange={e => handleChange('dob', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Gender *</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={eimData.genders.find(g => g.id === data?.gender)?.name || data?.gender || ''} onChange={e => handleChange('gender', e.target.value)} required>
            <option value="">Select Gender</option>
            {eimData.genders.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Civil Status</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.civilStatus || ''} onChange={e => handleChange('civilStatus', e.target.value)}>
            <option value="">Select Status</option>
            {eimData.civilStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Nationality / Citizenship *</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.nationality || ''} onChange={e => handleChange('nationality', e.target.value)} required>
            <option value="">Select Nationality</option>
            {eimData.nationalities.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">NIC / National ID Number</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.nicNo || ''} onChange={e => handleChange('nicNo', e.target.value)} placeholder="Required for local employees" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Passport Number</label>
          <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.passportNo || ''} onChange={e => handleChange('passportNo', e.target.value)} placeholder="Required for foreign employees" />
        </div>
      <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Blood Group</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.bloodGroup || ''} onChange={e => handleChange('bloodGroup', e.target.value)}>
            <option value="">Select Blood Group</option>
            {eimData.bloodGroups.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Religion</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.religion || ''} onChange={e => handleChange('religion', e.target.value)}>
            <option value="">Select Religion</option>
            {eimData.religions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
