import type { MemberData } from '../../../lib/api/users';
import EmployeeLookup from './EmployeeLookup';

export default function EmployeeFormHeader({ employeeId, data, busy, onSelect }: {
  employeeId?: string;
  data: { personalDetails: { fullName?: string }; employmentDetails: { employeeNumber?: string; employmentStatus?: string; employmentType?: string; dateJoined?: string }; workstationDetails: { designationId?: string; designation?: string } };
  busy: boolean;
  onSelect: (employee: MemberData) => void;
}) {
  return <>
    <header className="employee-editor-header">
      <div className="min-w-0">
        <h1>{employeeId ? 'Edit Employee' : 'Add New Employee'}</h1>
        <p>{employeeId ? 'Review and update the employee profile.' : 'Enter employee details below. Required fields are marked *.'}</p>
      </div>
      <EmployeeLookup onSelect={onSelect} disabled={busy} />
    </header>
    {employeeId && <dl className="employee-editor-summary" aria-label="Employee summary">
      <div><dt>Employee No</dt><dd>{data.employmentDetails.employeeNumber || 'Draft'}</dd></div>
      <div><dt>Full Name</dt><dd>{data.personalDetails.fullName || '—'}</dd></div>
      <div><dt>Designation</dt><dd>{data.workstationDetails.designation || '—'}</dd></div>
      <div><dt>Status</dt><dd>{data.employmentDetails.employmentStatus || 'Active'}</dd></div>
      <div><dt>Type / Join Date</dt><dd>{[data.employmentDetails.employmentType, data.employmentDetails.dateJoined].filter(Boolean).join(' · ') || '—'}</dd></div>
    </dl>}
  </>;
}
