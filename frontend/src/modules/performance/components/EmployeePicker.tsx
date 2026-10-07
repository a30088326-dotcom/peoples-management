import { useMemo, useState } from 'react';
import type { Employee } from '../types';
import { matchesEmployee } from '../utils/employeeSearch';
import { Button, inputClass } from './UI';
export default function EmployeePicker({employees,selected,onChange}:{employees:Employee[];selected:string[];onChange:(ids:string[])=>void}) {
  const [query,setQuery]=useState(''); const [department,setDepartment]=useState('');
  const departments=useMemo(()=>[...new Set(employees.map(e=>e.department).filter(Boolean))].sort(),[employees]);
  const shown=employees.filter(e=>(!department||e.department===department)&&matchesEmployee(e,query));
  return <div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><input aria-label="Search employees" className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, number, designation or department"/><select aria-label="Filter employee department" className={inputClass} value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(d=><option key={d}>{d}</option>)}</select></div>
    <div className="flex flex-wrap items-center gap-2"><Button secondary onClick={()=>onChange([...new Set([...selected,...shown.map(e=>e.id)])])}>Select shown</Button><Button secondary onClick={()=>onChange([])}>Clear selection</Button><span className="text-xs text-slate-500">{shown.length} results · {selected.length} selected (including hidden results)</span></div>
    <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">{shown.length?shown.map(e=><label key={e.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 text-sm"><input type="checkbox" checked={selected.includes(e.id)} onChange={event=>onChange(event.target.checked?[...new Set([...selected,e.id])]:selected.filter(id=>id!==e.id))}/><span className="font-semibold text-slate-700">{e.name}<span className="block font-normal text-xs text-slate-500">{e.employeeNumber} · {e.designation} · {e.department}</span><span className="block text-xs font-normal text-slate-400">Reports to: {e.managerName||'Owner / no manager'}</span></span></label>):<p className="p-5 text-sm text-slate-500">No employees match these filters. Your existing selection is unchanged.</p>}</div>
  </div>;
}
