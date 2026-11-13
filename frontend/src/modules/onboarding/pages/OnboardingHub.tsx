import { useEffect, useState } from 'react';
import { UserPlus, RefreshCw, Search, X, FileCheck2 } from 'lucide-react';
import { usersApi, invitesApi } from '../../../lib/api';
import type { MemberData } from '../../../lib/api/users';
import type { InviteData } from '../../../lib/api/invites';
import type { Screen } from '../../../types';
import OnboardingProfilePreview from '../../employee_information/components/OnboardingProfilePreview';

async function readPages<T>(fetchPage: (page: number) => Promise<{ data: { data: T[]; meta?: { totalPages: number } } }>) {
  const records: T[] = []; let page = 1, totalPages = 1;
  do { const response = await fetchPage(page); records.push(...response.data.data); totalPages = response.data.meta?.totalPages || 1; page++; } while (page <= totalPages);
  return records;
}
export default function OnboardingHub({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [people, setPeople] = useState<MemberData[]>([]), [invites, setInvites] = useState<InviteData[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState('');
  const [tab, setTab] = useState<'profiles' | 'invites'>('profiles'), [selected, setSelected] = useState<MemberData | null>(null);
  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const [members, invitations] = await Promise.all([readPages<MemberData>(page => usersApi.list({ page, limit: 100 })), readPages<InviteData>(page => invitesApi.list({ page, limit: 100 }))]);
      setPeople(members.filter(person => person.role === 'CANDIDATE' || Boolean(person.onboardingProfile) || Boolean(person.documents?.length)));
      setInvites(invitations);
    } catch { setError('Unable to load onboarding records. Please retry.'); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const pendingDocuments = people.reduce((sum, person) => sum + (person.documents || []).filter(doc => doc.status === 'PENDING').length, 0);
  const query = search.trim().toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(query);
  const filtered = people.filter(person => {
    const employeeStatus = person.employee?.employeeStatus?.trim().toLowerCase();
    const isActiveEmployee = Boolean(person.employee) && (employeeStatus || 'active') === 'active';

    return (!isActiveEmployee || query.length > 0) &&
      matches(`${person.name} ${person.email} ${person.employee?.employeeNo || ''}`);
  });

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-black text-slate-800">Onboarding</h1><p className="mt-1 text-sm text-slate-500">Track invitations, submitted details, documents and employee activation.</p></div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh onboarding records"
          title="Refresh"
          className="btn-secondary app-action-icon h-10 w-10"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
        <button type="button" onClick={() => onNavigate('verification')} className="btn-secondary gap-2">
          <FileCheck2 size={16} /> Review Documents
        </button>
        <button type="button" onClick={() => onNavigate('invite')} className="btn-primary gap-2">
          <UserPlus size={16} /> Send Invite
        </button>
      </div>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      ['Pending invitations', invites.filter(invite => invite.status === 'PENDING').length],
      ['Awaiting activation', people.filter(person => person.role === 'CANDIDATE').length],
      ['Submitted profiles', people.filter(person => person.onboardingProfile).length],
      ['Documents to review', pendingDocuments]
    ].map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-800">{loading ? '…' : count}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <nav aria-label="Onboarding records" className="flex gap-2">
          {(['profiles', 'invites'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (tab !== value) {
                  setTab(value);
                  setSearch('');
                }
              }}
              aria-pressed={tab === value}
              className={'rounded-lg px-4 py-2 text-sm font-semibold ' + (tab === value ? 'bg-blue-50 text-blue-700' : 'text-slate-500')}
            >
              {value === 'profiles' ? 'Profiles & Documents' : 'Invitations'}
            </button>
          ))}
        </nav>
        <label className="relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            aria-label="Search onboarding records"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={tab === 'profiles' ? 'Search by name, email or employee no…' : 'Search name or email…'}
            className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
          />
        </label>
      </div>
      <div className="overflow-x-auto" aria-busy={loading}>
        {loading ? <p role="status" className="p-6 text-sm text-slate-500">Loading onboarding records…</p> : tab === 'profiles' ? <table role="table" className="responsive-records-table w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Person', 'Profile', 'Documents', 'Contract', 'Employee status', 'Details'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{filtered.map(person => {
          const docs = person.documents || [], approved = docs.filter(doc => doc.status === 'APPROVED').length;
          return <tr key={person.id} className="border-t border-slate-100"><td data-label="Person" className="p-4"><p className="font-semibold text-slate-800">{person.name}</p><p className="text-xs text-slate-500">{person.email}</p></td><td data-label="Profile" className="p-4">{person.onboardingProfile ? 'Submitted' : 'Not submitted'}</td><td data-label="Documents" className="p-4">{approved}/{docs.length} approved{docs.some(doc => doc.status === 'REJECTED') && <p className="text-xs text-red-600">Replacement required</p>}</td><td data-label="Contract" className="p-4">{person.contract?.status?.replace(/_/g, ' ') || 'Not issued'}</td><td data-label="Employee status" className="p-4">{person.employee ? person.employee.employeeStatus || 'Active' : 'Awaiting activation'}</td><td data-label="Details" className="p-4"><button type="button" disabled={!person.onboardingProfile} onClick={() => setSelected(person)} className="app-action font-semibold text-blue-600 underline disabled:text-slate-400 disabled:no-underline">View submitted details</button></td></tr>;
        })}{!filtered.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No onboarding profiles found.</td></tr>}</tbody></table> : <table role="table" className="responsive-records-table w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Invitation', 'Designation / team', 'Status', 'Sent', 'Expires'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{invites.filter(invite => matches(`${invite.name} ${invite.email}`)).map(invite => <tr key={invite.id} className="border-t border-slate-100"><td data-label="Invitation" className="p-4"><p className="font-semibold">{invite.name}</p><p className="text-xs text-slate-500">{invite.email}</p></td><td data-label="Designation / team" className="p-4">{invite.designation}<p className="text-xs text-slate-500">{invite.team}</p></td><td data-label="Status" className="p-4">{invite.status}</td><td data-label="Sent" className="p-4">{new Date(invite.sentAt || invite.createdAt).toLocaleDateString()}</td><td data-label="Expires" className="p-4">{new Date(invite.expiresAt).toLocaleDateString()}</td></tr>)}{!invites.filter(invite => matches(`${invite.name} ${invite.email}`)).length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No invitations found.</td></tr>}</tbody></table>}
      </div>
    </section>
    {selected?.onboardingProfile && <div role="dialog" aria-modal="true" aria-label="Submitted onboarding details" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"><div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-bold text-slate-800">{selected.name} · Submitted onboarding details</h2><button type="button" onClick={() => setSelected(null)} aria-label="Close submitted details" className="app-action p-2 text-slate-500 app-action-icon"><X size={20} /></button></header><div className="overflow-y-auto p-5"><OnboardingProfilePreview key={selected.id} member={selected} /></div></div></div>}
  </div>;
}
