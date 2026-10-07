import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Search, UserPlus, Users, X } from 'lucide-react';
import { eimsApi } from '../../../lib/api/employee_information_audit';
import { eimApi } from '../../../lib/api/eimApi';
import { attendanceApi, type RosterGroup } from '../api/attendanceApi';

type Employee = {
  id: string;
  employeeNo?: string;
  isActive?: boolean;
  employeeStatus?: string;
  personalDetails?: { firstName?: string; lastName?: string } | null;
  user?: { name?: string } | null;
  department?: string;
  departmentId?: string | null;
  workstationDetails?: { departmentId?: string | null } | null;
  designation?: string;
};

type Department = { id: string; name: string; code?: string; structureType: string; isActive?: boolean | number; status?: string };

type Assignment = {
  id: string;
  employeeId: string;
  groupId?: string;
  rosterGroupId?: string;
  assignedRosterId?: string;
  groupName?: string;
  status: string;
};

const employeeName = (employee: Employee) =>
  [employee.personalDetails?.firstName, employee.personalDetails?.lastName].filter(Boolean).join(' ').trim()
  || employee.user?.name || employee.employeeNo || 'Employee';

export default function AssignEmployee() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rosters, setRosters] = useState<RosterGroup[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mode, setMode] = useState<'department' | 'employee'>('employee');
  const [departmentQuery, setDepartmentQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [query, setQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = async () => {
    const [employeeResponse, rosterResponse, assignmentResponse, departmentResponse] = await Promise.all([
      eimsApi.getEmployees(),
      attendanceApi.getRosterGroups(),
      attendanceApi.getAssignments(),
      eimApi.getStructures()
    ]);
    setEmployees((employeeResponse.data.data || []).filter((employee: Employee) =>
      employee.isActive !== false && employee.employeeStatus !== 'Inactive'
    ));
    setRosters(rosterResponse.data.data || []);
    setAssignments(assignmentResponse.data.data || []);
    setDepartments((departmentResponse.data.data || []).filter((department: Department) =>
      department.structureType === 'Department' && department.isActive !== false && department.isActive !== 0 && (!department.status || department.status === 'Active')
    ));
  };

  useEffect(() => {
    refresh().catch((err: any) => setError(err.response?.data?.message || 'Could not load employees and rosters.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredEmployees = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return [];
    return employees.filter(employee =>
      [employeeName(employee), employee.employeeNo, employee.department, employee.designation]
        .some(value => String(value || '').toLowerCase().includes(search))
    ).slice(0, 12);
  }, [employees, query]);

  const departmentEmployees = (departmentId: string) => employees.filter(employee =>
    (employee.workstationDetails?.departmentId || employee.departmentId) === departmentId
  );
  const filteredDepartments = useMemo(() => {
    const search = departmentQuery.trim().toLowerCase();
    if (!search) return departments;
    return departments.filter(department => [department.name, department.code].some(value => String(value || '').toLowerCase().includes(search)));
  }, [departments, departmentQuery]);
  const selectedDepartment = departments.find(department => department.id === selectedDepartmentId);
  const departmentMembers = selectedDepartment ? departmentEmployees(selectedDepartment.id) : [];
  const hasTarget = mode === 'department' ? Boolean(selectedDepartment && departmentMembers.length) : Boolean(selectedEmployeeId);

  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId);
  const currentAssignment = assignments.find(assignment =>
    assignment.employeeId === selectedEmployeeId && assignment.status === 'Active'
  );
  const selectedRoster = rosters.find(roster => roster.id === selectedRosterId);

  const selectEmployee = (employee: Employee) => {
    const assignment = assignments.find(item => item.employeeId === employee.id && item.status === 'Active');
    setSelectedEmployeeId(employee.id);
    setSelectedRosterId(assignment?.assignedRosterId || assignment?.groupId || assignment?.rosterGroupId || '');
    setQuery('');
    setError('');
    setSuccess('');
  };

  const clearSelectedEmployee = () => {
    setSelectedEmployeeId('');
    setSelectedRosterId('');
    setQuery('');
    setError('');
    setSuccess('');
  };

  const switchMode = (next: 'department' | 'employee') => {
    setMode(next);
    clearSelectedEmployee();
    setSelectedDepartmentId('');
    setDepartmentQuery('');
  };

  const selectDepartment = (department: Department) => {
    setSelectedDepartmentId(department.id);
    setDepartmentQuery('');
    setSelectedRosterId('');
    setError('');
    setSuccess('');
  };

  const save = async () => {
    if (!hasTarget || !selectedRosterId || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const today = new Date();
      const effectiveStartDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const result = await attendanceApi.assignEmployees({
        ...(mode === 'department' ? { departmentId: selectedDepartmentId } : { employeeIds: [selectedEmployeeId] }),
        groupId: selectedRosterId, effectiveStartDate
      });
      setSuccess(mode === 'department'
        ? `${result.data.data.assignedCount} employees in ${selectedDepartment?.name} were assigned to ${selectedRoster?.name || 'the roster'}.`
        : `${employeeName(selectedEmployee!)} was assigned to ${selectedRoster?.name || 'the roster'}.`);
      // Assignment is already committed; a refresh failure must not suggest it failed or invite a duplicate retry.
      try { await refresh(); } catch { setError('Roster assigned, but the latest list could not be loaded. Refresh this page before making another change.'); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save the roster assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800"><UserPlus className="text-indigo-600" /> Assign Employee</h2>
        <p className="mt-1 text-sm text-slate-500">Assign a roster to a whole department or to one employee.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={17} />{success}</div>}

      <div className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
          <button type="button" disabled={saving || loading} aria-pressed={mode === 'department'} onClick={() => switchMode('department')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold disabled:opacity-50 ${mode === 'department' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}><Building2 size={17} /> Search department</button>
          <button type="button" disabled={saving || loading} aria-pressed={mode === 'employee'} onClick={() => switchMode('employee')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold disabled:opacity-50 ${mode === 'employee' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}><UserPlus size={17} /> Search employee</button>
        </div>

        {mode === 'department' && <div className="space-y-3">
          <div className="relative">
            <label htmlFor="roster-department-search" className="mb-2 block text-sm font-semibold text-slate-700">Search department</label>
            <Search size={17} className="absolute left-3 top-[44px] text-slate-400" />
            <input id="roster-department-search" value={departmentQuery} onChange={event => setDepartmentQuery(event.target.value)} placeholder="Department name or code" disabled={loading || saving} className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-500" />
          </div>
          {(!selectedDepartment || departmentQuery.trim()) && <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
            {filteredDepartments.length ? filteredDepartments.map(department => (
              <button key={department.id} disabled={saving} type="button" onClick={() => selectDepartment(department)} className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-indigo-50">
                <span><span className="block text-sm font-semibold text-slate-800">{department.name}</span><span className="block text-xs text-slate-500">{department.code}</span></span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{departmentEmployees(department.id).length} employees</span>
              </button>
            )) : <p className="px-4 py-3 text-sm text-slate-500">{loading ? 'Loading departments…' : 'No departments found.'}</p>}
          </div>}
        </div>}

        {mode === 'employee' && <div className="relative">
          <label htmlFor="roster-employee-search" className="mb-2 block text-sm font-semibold text-slate-700">Search employee</label>
          <Search size={17} className="absolute left-3 top-[44px] text-slate-400" />
          <input
            id="roster-employee-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Name, employee number, department or job"
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            disabled={loading || saving}
          />
          {query.trim() && <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filteredEmployees.length ? filteredEmployees.map(employee => (
              <button key={employee.id} disabled={saving} type="button" onClick={() => selectEmployee(employee)} className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-indigo-50">
                <span className="block text-sm font-semibold text-slate-800">{employeeName(employee)}</span>
                <span className="block text-xs text-slate-500">{employee.employeeNo || 'No employee number'} · {employee.department || employee.designation || 'Employee'}</span>
              </button>
            )) : <p className="px-4 py-3 text-sm text-slate-500">No employees found.</p>}
          </div>}
        </div>}

        {mode === 'employee' && selectedEmployee && <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Selected employee</p>
            <p className="mt-1 font-semibold text-slate-800">{employeeName(selectedEmployee)} <span className="font-normal text-slate-500">· {selectedEmployee.employeeNo || 'No employee number'}</span></p>
            <p className="mt-1 text-xs text-slate-600">Current roster: {currentAssignment?.groupName || 'Not assigned'}</p>
          </div>
          <button type="button" onClick={clearSelectedEmployee} disabled={saving} aria-label="Clear selected employee" title="Clear selected employee" className="shrink-0 rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>}

        {mode === 'department' && selectedDepartment && <div className="overflow-hidden rounded-xl border border-indigo-200">
          <div className="flex items-center justify-between gap-3 bg-indigo-50 px-4 py-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Selected department</p><p className="mt-1 font-semibold text-slate-800">{selectedDepartment.name}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><Users size={14} />{departmentMembers.length} active employees</p></div>
            <button type="button" disabled={saving} aria-label="Clear selected department" onClick={() => { setSelectedDepartmentId(''); setSelectedRosterId(''); setDepartmentQuery(''); setSuccess(''); setError(''); }} className="rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-100 disabled:opacity-50"><X size={18} /></button>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
            {departmentMembers.length ? departmentMembers.map(employee => {
              const current = assignments.find(item => item.employeeId === employee.id && item.status === 'Active');
              return <div key={employee.id} className="flex flex-wrap items-center justify-between gap-1 px-4 py-2.5 text-xs"><span><span className="font-semibold text-slate-800">{employeeName(employee)}</span><span className="ml-2 text-slate-500">{employee.employeeNo}</span></span><span className="text-slate-500">{current?.groupName || 'Not assigned'}</span></div>;
            }) : <p className="px-4 py-3 text-sm text-amber-700">No active employees in this department.</p>}
          </div>
          {departmentMembers.length > 0 && <p className="border-t border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs text-slate-600">Saving assigns this roster to all current active employees in this department and replaces their current roster. Assign future new employees separately using Search employee.</p>}
        </div>}

        <div>
          <label htmlFor="employee-roster-select" className="mb-2 block text-sm font-semibold text-slate-700">Roster</label>
          <select id="employee-roster-select" value={selectedRosterId} onChange={event => { setSelectedRosterId(event.target.value); setSuccess(''); }} disabled={!hasTarget || loading || saving} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50">
            <option value="">Select roster</option>
            {rosters.filter(roster => (roster.status === 'Active' || roster.status === 'Draft') && Boolean(roster.shifts?.length)).map(roster =>
              <option key={roster.id} value={roster.id}>{roster.name} ({roster.code})</option>
            )}
          </select>
          {!rosters.some(roster => (roster.status === 'Active' || roster.status === 'Draft') && roster.shifts?.length) && <p className="mt-2 text-xs text-amber-700">Create a roster with a shift first.</p>}
          {selectedRoster && <p className="mt-2 text-xs text-slate-500">{selectedRoster.shifts?.length || 0} shift(s) · {selectedRoster.status} · Effective today</p>}
        </div>

        <button type="button" onClick={save} disabled={!hasTarget || !selectedRosterId || loading || saving || (mode === 'employee' && selectedRosterId === (currentAssignment?.assignedRosterId || currentAssignment?.groupId || currentAssignment?.rosterGroupId))} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Saving...' : mode === 'department' ? `Assign roster to ${departmentMembers.length} employees` : currentAssignment ? 'Change roster' : 'Assign roster'}
        </button>
      </div>
    </div>
  );
}
