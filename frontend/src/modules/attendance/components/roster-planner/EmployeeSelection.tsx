import { useState } from 'react';
import type { RosterOptions } from '../../api/rosterPlannerApi';

export default function EmployeeSelection({ options, selected, onChange }: {
  options: RosterOptions; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [department, setDepartment] = useState('');
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const visible = options.employees.filter(employee => (!department || employee.departmentId === department) &&
    [employee.name, employee.employeeNumber, employee.designation].some(value => value.toLowerCase().includes(search)));

  return <section className="roster-section" aria-labelledby="roster-employees-title">
    <div className="roster-section-heading"><h3 id="roster-employees-title">Select Employees</h3><span>{selected.length} selected</span></div>
    <div className="roster-fields">
      <label>Department<select value={department} onChange={event => setDepartment(event.target.value)} className="input-field">
        <option value="">All Departments</option>{options.departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Find employees<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, ID or designation" className="input-field" /></label>
    </div>
    <div className="roster-employee-picker">
      {visible.length === 0 && <p>No employees match this filter.</p>}
      {visible.map(employee => <label key={employee.id} className="roster-employee-choice">
        <input type="checkbox" checked={selected.includes(employee.id)} onChange={event => onChange(event.target.checked
          ? [...selected, employee.id] : selected.filter(id => id !== employee.id))} />
        <span><strong>{employee.name}</strong><small>{[employee.employeeNumber, employee.designation, employee.department].filter(Boolean).join(' · ')}</small></span>
      </label>)}
    </div>
    {selected.length > 0 && <p className="roster-hint">Selected: {selected.map(id => options.employees.find(employee => employee.id === id)?.name || 'Unavailable employee').join(', ')}</p>}
  </section>;
}
