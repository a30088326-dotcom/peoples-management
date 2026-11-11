import { useEffect, useState } from 'react';
import type { MemberData } from '../../../lib/api/users';
import { eimApi } from '../../../lib/api/eimApi';
import { documentsApi } from '../../../lib/api/documents';

export default function OnboardingProfilePreview({ member }: { member: MemberData }) {
  const profile = member.onboardingProfile!;
  const [genders, setGenders] = useState<{ id: string; name: string }[]>([]);
  const [genderLoaded,setGenderLoaded]=useState(false);
  const [nationalities,setNationalities]=useState<{id:string;name:string}[]>([]);
  const [documents, setDocuments] = useState<{ id: string; label?: string; type: string; status: string }[]>([]);
  const [documentError, setDocumentError] = useState('');
  const [documentsLoading,setDocumentsLoading]=useState(true);
  useEffect(() => { eimApi.getGenders().then(response => setGenders(response.data.data || [])).catch(() => {}).finally(()=>setGenderLoaded(true)); }, []);
  useEffect(()=>{eimApi.getNationalities().then(response=>setNationalities(response.data.data||[])).catch(()=>{});},[]);
  useEffect(() => {
    setDocumentsLoading(true);
    documentsApi.list(member.id).then(response => { setDocuments(response.data.data || []); setDocumentError(''); })
      .catch(() => setDocumentError('Could not load submitted documents. Reopen this profile to retry.'))
      .finally(()=>setDocumentsLoading(false));
  }, [member.id]);
  const sections: { title: string; fields: [string, string | undefined][] }[] = [
    { title: 'Personal Details', fields: [
      ['First Name', profile.firstName], ['Last Name', profile.lastName],
      ['Date of Birth', profile.dateOfBirth?.slice(0, 10)],
      ['Gender', genders.find(gender => gender.id === profile.gender)?.name || (/^[a-f\d-]{36}$/i.test(profile.gender||'')?(genderLoaded?'Gender lookup unavailable':'Loading gender…'):profile.gender)],
      ['Nationality', nationalities.find(nationality=>nationality.id===profile.nationality)?.name||profile.nationality], ['Address Line 1', profile.addressLine1],
      ['Address Line 2', profile.addressLine2], ['City', profile.city], ['Postal Code', profile.postalCode],
    ] },
    { title: 'Contact & Emergency Contact', fields: [
      ['Email', member.email], ['Phone Number', profile.phoneNumber], ['Alternate Phone', profile.alternatePhone],
      ['LinkedIn Profile', profile.linkedIn], ['Emergency Contact Name', profile.emergencyContactName],
      ['Relationship', profile.emergencyContactRelation], ['Emergency Phone', profile.emergencyContactPhone],
    ] },
    { title: 'Bank & Payment Details', fields: [
      ['Bank Name', profile.bankName], ['Account Holder Name', profile.accountHolderName],
      ['Account Number', profile.accountNumber], ['Account Type', profile.accountType], ['Currency', profile.currency],
    ] },
  ];
  return <div className="space-y-5">
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      Submitted onboarding details for {member.email}. {member.employee?'Employee profile created. Document verification status is shown below.':'HR review and employee activation are pending.'}
    </div>
    {sections.map(section => <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-base font-bold text-slate-800">{section.title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{section.fields.map(([label, value]) => <div key={label}>
        <dt className="text-xs font-semibold text-slate-500">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{value || 'Not provided'}</dd>
      </div>)}</dl>
    </section>)}
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 font-bold text-slate-800">Submitted Documents</h3>
      {documentsLoading&&<p role="status" className="text-sm text-slate-500">Loading submitted documents…</p>}
      {documentError && <p role="alert" className="text-sm text-red-700">{documentError}</p>}
      <ul className="space-y-2">{documents.map(document => <li key={document.id} className="flex justify-between gap-3 text-sm">
        <span>{document.label || document.type.replace(/_/g, ' ')}</span><span className="text-slate-500">{document.status}</span>
      </li>)}</ul>
      {!documentsLoading && !documents.length && !documentError && <p className="text-sm text-slate-500">No documents submitted yet.</p>}
    </section>
  </div>;
}
