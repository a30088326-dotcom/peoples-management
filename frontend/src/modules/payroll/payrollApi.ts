import { api } from '../../lib/api/client';

export type Profile = { employeeId: string; effectiveMonth: string; basic: number; allowance: number; loan: number; enabled: boolean };
export type Rules = { effectiveMonth: string; otDivisor: number; hoursPerDay: number; otMultiplier: number;
  noPayBasis: 'roster' | 'fixed'; fixedDivisor: number; allowanceEligible: boolean; serviceEligible: boolean; otEligible: boolean;
  taxMode: 'verified-input' | 'table01-2025-26' };
export type Input = { employeeId: string; service: number; otHours: number; apit: number | null; checked: boolean };
export type Amounts = Record<'noPay' | 'earnedBasic' | 'allowance' | 'service' | 'overtime' | 'gross' | 'base' |
  'employeeEpf' | 'employerEpf' | 'etf' | 'apit' | 'loan' | 'deductions' | 'net' | 'employerCost', number>;
export type Employee = { id: string; name: string; employeeNumber: string; department: string; designation: string; profile: Profile | null };
export type Line = Pick<Employee, 'name' | 'employeeNumber' | 'department' | 'designation'> & {
  employeeId: string; profile: Profile; input: Input; rosterDays: number; paidDays: number; unpaidDays: number;
  workedHours: number; recordedOt: number; issues: string[]; amounts: Amounts | null;
};
export type Action = 'calculate' | 'submit' | 'approve' | 'return';
export type Payroll = { period: string; status: 'draft' | 'calculated' | 'submitted' | 'approved'; version: number;
  employees: Employee[]; rows: Line[]; rules: Rules; rulesConfigured: boolean; stale: boolean;
  access: { canCreate: boolean; canEdit: boolean; canApprove: boolean; canExport: boolean };
  audit: { action: string; at: string; actor: string }[] };
const path = '/api/payroll';
export const payrollApi = {
  view: (month: string, signal: AbortSignal) => api.get<{ data: Payroll }>(`${path}/${month}`, { signal }),
  profile: (value: Profile) => api.put(`${path}/profiles/save`, value),
  rules: (value: Rules) => api.put(`${path}/rules/save`, value),
  input: (month: string, value: Input) => api.put(`${path}/${month}/inputs`, value),
  run: (month: string, action: Action, version: number) => api.post(`${path}/${month}/${action}`, { version }),
};
export const money = (value: number) => value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const monthLabel = (value: string) => new Date(value + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const statusLabel = { draft: 'Draft', calculated: 'Calculated', submitted: 'Awaiting approval', approved: 'Approved' };
export const payrollMessage = (failure: unknown) => (failure as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payroll could not be loaded or saved. Try again.';
