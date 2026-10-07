import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, UserRound } from 'lucide-react';
import AddEmployeeForm from '../components/AddEmployeeForm';
import { eimsApi } from '../../../lib/api/employee_information_audit';
import { useAuth } from '../../../context/AuthContext';
import { CustomEmployeeFields } from '../../assistant/Assistant';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

type EmployeeSummary = {
  id: string; employeeNo?: string; department?: string; designation?: string;
  organizationalRank?: string; isActive?: boolean;
  personalDetails?: { firstName?: string; lastName?: string } | null;
  user?: { name?: string; email?: string } | null;
};
const displayName = (employee: EmployeeSummary) => {
  const personal = `${employee.personalDetails?.firstName || ''} ${employee.personalDetails?.lastName || ''}`.trim();
  return personal || employee.user?.name || employee.employeeNo || 'Employee';
};

export default function AdvancedEims() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadEmployees = async () => {
    setLoading(true);
    try { const response = await eimsApi.getEmployees(); setEmployees(response.data.data || []); setError(''); }
    catch (err: any) { setError(err?.response?.data?.message || 'Unable to load employee information.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadEmployees(); }, []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(employee => [displayName(employee), employee.employeeNo, employee.department, employee.designation, employee.user?.email].some(value => value?.toLowerCase().includes(query)));
  }, [employees, search]);

  if (creating || selectedId) return (
    <div className="workspace-frame p-4 sm:p-6 w-full max-w-7xl mx-auto">
      <button type="button" onClick={() => { setCreating(false); setSelectedId(undefined); void loadEmployees(); }} className="mb-4 shrink-0 self-start inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"><ArrowLeft size={16} /> Back to employee directory</button>
      <AddEmployeeForm employeeId={selectedId} onClose={() => { setCreating(false); setSelectedId(undefined); }} onSuccess={() => { setCreating(false); setSelectedId(undefined); void loadEmployees(); }}>
        {selectedId && <CustomEmployeeFields employeeId={selectedId} />}
      </AddEmployeeForm>
    </div>
  );

  return (
    <div className="workspace-frame p-4 sm:p-8 w-full max-w-7xl mx-auto gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div><h2 className="text-2xl font-bold text-slate-800">Employee Information</h2><p className="text-sm text-slate-500 mt-1">Select an employee to view the complete profile, organization, roster and attendance mapping.</p></div>
        {isAdmin && <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={17} /> Add employee</button>}
      </div>
      <div className="workspace-frame rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap shrink-0 items-center justify-between gap-3 border-b border-slate-100 p-4"><div className="relative max-w-md flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, employee number, department..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></div><span className="text-sm text-slate-500">{employees.length} active employees</span></div>
        <WorkspaceScrollArea label="Employee directory">
        {error && <div className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading employee directory...</div> : <div className="divide-y divide-slate-100">
          {filtered.map(employee => <button key={employee.id} type="button" onClick={() => setSelectedId(employee.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-blue-50/50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><UserRound size={19} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{displayName(employee)}</span><span className="mt-0.5 block text-xs text-slate-500">{employee.employeeNo || 'No employee number'} · {employee.user?.email || 'No login email'}</span></span><span className="hidden min-w-40 text-sm text-slate-600 md:block">{employee.designation || '—'}<span className="block text-xs text-slate-400">{employee.department || '—'}</span></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{employee.organizationalRank || 'EMPLOYEE'}</span><span className="text-xs font-semibold text-blue-600">View details →</span></button>)}
          {!filtered.length && <div className="p-8 text-center text-sm text-slate-500">No employees match your search.</div>}
        </div>}
        </WorkspaceScrollArea>
      </div>
    </div>
  );
}
