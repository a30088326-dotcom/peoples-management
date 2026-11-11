import { useState, type FormEvent } from 'react';
import { payrollApi, payrollMessage, type Employee, type Input, type Line, type Profile, type Rules } from '../payrollApi';

type SaveProps = { onSaved: () => void; locked?: boolean };
function SaveState({ busy, error, locked }: { busy: boolean; error: string; locked?: boolean }) {
  return <>{error && <p className="payroll-alert" role="alert">{error}</p>}
    <button className="btn-primary" type="submit" disabled={busy || locked}>{busy ? 'Saving…' : 'Save'}</button></>;
}
function useSave(onSaved: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (event: FormEvent, action: () => Promise<unknown>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); onSaved(); }
    catch (failure) { setError(payrollMessage(failure)); }
    finally { setBusy(false); }
  };
  return { busy, error, save };
}
function Numeric({ label, value, change, max, min = 0, step = '0.01' }: {
  label: string; value: number | null; change: (value: number | null) => void; max?: number; min?: number; step?: string;
}) {
  return <label>{label}<input className="input-field" type="number" min={min} max={max} step={step} value={value ?? ''}
    onChange={event => change(event.target.value === '' ? null : Number(event.target.value))} /></label>;
}
export function ProfileEditor({ employee, month, onSaved, locked }: SaveProps & { employee: Employee; month: string }) {
  const [profile, set] = useState<Profile>({ basic: 0, allowance: 0, loan: 0, enabled: true, ...employee.profile,
    effectiveMonth: month, employeeId: employee.id });
  const state = useSave(onSaved);
  return <form className="payroll-form" onSubmit={event => void state.save(event, () => payrollApi.profile(profile))}>
    <fieldset disabled={locked || state.busy}>
      <label>Effective month<input className="input-field" type="month" required value={profile.effectiveMonth}
        onChange={event => set({ ...profile, effectiveMonth: event.target.value })} /></label>
      <Numeric label="Monthly basic salary (LKR)" value={profile.basic} change={basic => set({ ...profile, basic: basic ?? 0 })} min={0.01} />
      <Numeric label="Fixed allowance (LKR)" value={profile.allowance} change={allowance => set({ ...profile, allowance: allowance ?? 0 })} />
      <Numeric label="Loan instalment (LKR)" value={profile.loan} change={loan => set({ ...profile, loan: loan ?? 0 })} />
      <label className="payroll-check"><input type="checkbox" checked={profile.enabled} onChange={event => set({ ...profile, enabled: event.target.checked })} /> Include in monthly payroll</label>
    </fieldset>
    <SaveState {...state} locked={locked} />
  </form>;
}
export function InputEditor({ row, month, manualTax, onSaved, locked }: SaveProps & { row: Line; month: string; manualTax: boolean }) {
  const [input, set] = useState<Input>(row.input);
  const state = useSave(onSaved);
  return <form className="payroll-form" onSubmit={event => void state.save(event, () => payrollApi.input(month, input))}>
    <fieldset disabled={locked || state.busy}>
      <Numeric label="Service charge (LKR)" value={input.service} change={service => set({ ...input, service: service ?? 0 })} />
      <Numeric label={`Approved overtime hours (recorded ${row.recordedOt})`} value={input.otHours} max={row.recordedOt}
        change={otHours => set({ ...input, otHours: otHours ?? 0 })} />
      {manualTax && <Numeric label="Verified APIT (LKR)" value={input.apit} change={apit => set({ ...input, apit })} />}
      <label className="payroll-check"><input type="checkbox" checked={input.checked} onChange={event => set({ ...input, checked: event.target.checked })} /> I reviewed the imported attendance and these payroll inputs</label>
    </fieldset>
    <SaveState {...state} locked={locked} />
  </form>;
}
export function RulesEditor({ rules, month, onSaved, locked }: SaveProps & { rules: Rules; month: string }) {
  const [value, set] = useState<Rules>({ ...rules, effectiveMonth: month });
  const state = useSave(onSaved);
  const numbers = [['otDivisor', 'Overtime divisor (days)', 31], ['hoursPerDay', 'Hours per day', 24], ['otMultiplier', 'Overtime multiplier', 10], ['fixedDivisor', 'Fixed no-pay divisor', 31]] as const;
  const eligibility = [['allowanceEligible', 'Fixed allowance'], ['serviceEligible', 'Service charge'], ['otEligible', 'Approved overtime']] as const;
  return <form className="payroll-form" onSubmit={event => void state.save(event, () => payrollApi.rules(value))}>
    <fieldset disabled={locked || state.busy}>
      <label>Effective month<input className="input-field" type="month" required value={value.effectiveMonth} onChange={event => set({ ...value, effectiveMonth: event.target.value })} /></label>
      {numbers.map(([key, label, max]) => <Numeric key={key} label={label} value={value[key]} max={max} min={1}
        step={key.endsWith('Divisor') ? '1' : '0.01'} change={number => set({ ...value, [key]: number ?? 0 })} />)}
      <label>Unpaid-leave basis<select className="input-field" value={value.noPayBasis} onChange={event => set({ ...value, noPayBasis: event.target.value as Rules['noPayBasis'] })}>
        <option value="roster">Scheduled roster days</option><option value="fixed">Fixed divisor</option></select></label>
      <label>APIT source<select className="input-field" value={value.taxMode} onChange={event => set({ ...value, taxMode: event.target.value as Rules['taxMode'] })}>
        <option value="verified-input">Verified amount per employee</option><option value="table01-2025-26">IRD Table 01 reference (2025/26)</option></select></label>
      <div><strong>Contribution earnings</strong>{eligibility.map(([key, label]) => <label className="payroll-check" key={key}>
        <input type="checkbox" checked={value[key]} onChange={event => set({ ...value, [key]: event.target.checked })} /> {label}</label>)}</div>
    </fieldset>
    <p>EPF is 8% employee and 12% employer. ETF is 3% employer. Verify which earning components apply before saving your policy.</p>
    <SaveState {...state} locked={locked} />
  </form>;
}
