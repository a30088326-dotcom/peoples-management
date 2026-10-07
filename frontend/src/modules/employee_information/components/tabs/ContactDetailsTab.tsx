import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { eimApi } from '../../../../lib/api/eimApi';

export default function ContactDetailsTab({ data, update }: { data: any, update: (d: any) => void }) {
  const [relationshipTypes, setRelationshipTypes] = useState<any[]>([]);

  useEffect(() => {
    eimApi.getRelationshipTypes()
      .then(res => setRelationshipTypes(res.data?.data || []))
      .catch(e => console.error(e));
  }, []);
  const handleChange = (section: string, field: string, value: any) => {
    update({ [section]: { ...data[section], [field]: value } });
  };

  const handleFlatChange = (field: string, value: string) => {
    update({ [field]: value });
  };

  const addEmergencyContact = () => {
    const current = data.emergencyContacts || [];
    update({ emergencyContacts: [...current, { name: '', relationship: '', primaryPhone: '', altPhone: '', address: '', priority: current.length + 1, isPrimary: current.length === 0 }] });
  };

  const updateEmergencyContact = (index: number, field: string, value: any) => {
    const current = [...(data.emergencyContacts || [])];
    
    // If setting a new primary, unset others
    if (field === 'isPrimary' && value === true) {
      current.forEach(c => c.isPrimary = false);
    }
    
    current[index] = { ...current[index], [field]: value };
    update({ emergencyContacts: current });
  };

  const removeEmergencyContact = (index: number) => {
    const current = [...(data.emergencyContacts || [])];
    current.splice(index, 1);
    update({ emergencyContacts: current });
  };

  const copyPermanentToWorking = (checked: boolean) => {
    handleChange('working', 'sameAsPermanent', checked);
    if (checked && data.permanent) {
      update({
        working: {
          ...data.working,
          address: data.permanent.address,
          city: data.permanent.city,
          province: data.permanent.province,
          postalCode: data.permanent.postalCode,
          country: data.permanent.country,
          sameAsPermanent: true
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Contact */}
        <div className="border border-slate-200 p-4 rounded-xl">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Personal Contact</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Personal Mobile</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.personal?.mobile || ''} onChange={e => handleChange('personal', 'mobile', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Personal Email</label>
              <input type="email" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.personal?.email || ''} onChange={e => handleChange('personal', 'email', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">LinkedIn Profile</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.linkedIn || ''} onChange={e => handleFlatChange('linkedIn', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
        </div>

        {/* Official Contact */}
        <div className="border border-slate-200 p-4 rounded-xl">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Official Contact</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Official Email</label>
              <input type="email" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.official?.email || ''} onChange={e => handleChange('official', 'email', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Official Mobile</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.official?.mobile || ''} onChange={e => handleChange('official', 'mobile', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Extension</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.official?.ext || ''} onChange={e => handleChange('official', 'ext', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Work Location</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.official?.workLocation || ''} onChange={e => handleChange('official', 'workLocation', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Permanent Address */}
        <div className="border border-slate-200 p-4 rounded-xl">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Permanent Address</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Address</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.permanent?.address || ''} onChange={e => handleChange('permanent', 'address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">City</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.permanent?.city || ''} onChange={e => handleChange('permanent', 'city', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Postal Code</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.permanent?.postalCode || ''} onChange={e => handleChange('permanent', 'postalCode', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Province/State</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.permanent?.province || ''} onChange={e => handleChange('permanent', 'province', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Country</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.permanent?.country || ''} onChange={e => handleChange('permanent', 'country', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Working Address */}
        <div className="border border-slate-200 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-slate-700 text-sm">Working Address</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data?.working?.sameAsPermanent || false} onChange={e => copyPermanentToWorking(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-medium text-slate-600">Same as Permanent</span>
            </label>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Address</label>
              <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.working?.address || ''} onChange={e => handleChange('working', 'address', e.target.value)} disabled={data?.working?.sameAsPermanent} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">City</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.working?.city || ''} onChange={e => handleChange('working', 'city', e.target.value)} disabled={data?.working?.sameAsPermanent} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Postal Code</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.working?.postalCode || ''} onChange={e => handleChange('working', 'postalCode', e.target.value)} disabled={data?.working?.sameAsPermanent} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Province/State</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.working?.province || ''} onChange={e => handleChange('working', 'province', e.target.value)} disabled={data?.working?.sameAsPermanent} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Country</label>
                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.working?.country || ''} onChange={e => handleChange('working', 'country', e.target.value)} disabled={data?.working?.sameAsPermanent} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="border border-slate-200 p-4 rounded-xl">
        <label className="text-sm font-bold text-slate-700 mb-2 block">Primary Contact Preference</label>
        <select className="p-2 border border-slate-200 rounded-lg w-full md:w-1/2" value={data?.primaryContactPreference || 'personal_mobile'} onChange={e => handleFlatChange('primaryContactPreference', e.target.value)}>
          <option value="personal_mobile">Personal Mobile</option>
          <option value="personal_email">Personal Email</option>
          <option value="official_mobile">Official Mobile</option>
          <option value="official_email">Official Email</option>
        </select>
      </div>

      {/* Emergency Contacts */}
      <div className="border border-slate-200 p-4 rounded-xl mt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-slate-700 text-sm">Emergency Contacts</h4>
          <button type="button" onClick={addEmergencyContact} className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
            <Plus size={14} /> Add Contact
          </button>
        </div>
        
        <div className="space-y-4">
          {(data?.emergencyContacts || []).map((contact: any, idx: number) => (
            <div key={idx} className={`p-4 border ${contact.isPrimary ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-100 bg-slate-50'} rounded-lg relative`}>
              <button type="button" onClick={() => removeEmergencyContact(idx)} className="absolute top-3 right-3 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="primaryEmergency" checked={contact.isPrimary} onChange={() => updateEmergencyContact(idx, 'isPrimary', true)} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-slate-700">Primary Contact</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Contact Name *</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={contact.name} onChange={e => updateEmergencyContact(idx, 'name', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Relationship *</label>
                  <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={contact.relationship} onChange={e => updateEmergencyContact(idx, 'relationship', e.target.value)} required>
                    <option value="">Select Relationship</option>
                    {relationshipTypes.map(rt => <option key={rt.id} value={rt.name}>{rt.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Priority *</label>
                  <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={contact.priority} onChange={e => updateEmergencyContact(idx, 'priority', parseInt(e.target.value))} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Primary Phone Number *</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={contact.primaryPhone} onChange={e => updateEmergencyContact(idx, 'primaryPhone', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Alternative Phone Number</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={contact.altPhone} onChange={e => updateEmergencyContact(idx, 'altPhone', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Address</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={contact.address} onChange={e => updateEmergencyContact(idx, 'address', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          {(!data?.emergencyContacts || data.emergencyContacts.length === 0) && (
            <div className="text-sm text-slate-400 italic text-center py-4">No emergency contacts added.</div>
          )}
        </div>
      </div>

    </div>
  );
}
