import { createHash } from 'node:crypto';
import { storageNow } from '../../storage/repository';
import { defaultRules, type Input, type Profile, type Rules } from './calculation';
import { employeesFor, latest, prepareInputs, type PayrollLine } from './inputs';
import { payrollReader, PayrollError, payrollWrite, type PayrollStore } from './store';

type Status = 'calculated' | 'submitted' | 'approved';
type Audit = { action: string; actor: string; at: string };
type Snapshot = { status: Status; rows: PayrollLine[]; rules: Rules; fingerprint: string; calculatedBy: string; audit: Audit[] };
const runId = (period: string) => 'run:' + period;
const fingerprint = (rules: Rules, rows: PayrollLine[]) => createHash('sha256').update(JSON.stringify([rules, rows])).digest('hex');
const audit = (action: string, actor: string): Audit => ({ action, actor, at: storageNow() });

async function effectiveRules(store: PayrollStore, period: string) {
  return latest<Rules>(await store.records('rules'), period);
}
export async function viewPayroll(period: string) {
  const store = payrollReader();
  const [record, rules] = await Promise.all([store.get(runId(period)), effectiveRules(store, period)]);
  const snapshot = record?.payload as Snapshot | undefined;
  if (snapshot?.status === 'approved') {
    return { period, rules: snapshot.rules, rulesConfigured: true, employees: await employeesFor(store, period),
      rows: snapshot.rows, status: snapshot.status, version: record!._version, audit: snapshot.audit, stale: false };
  }
  const { rows, employees } = await prepareInputs(store, period, rules);
  const stale = Boolean(snapshot && (!rules || fingerprint(rules, rows) !== snapshot.fingerprint));
  return { period, rules: rules ?? { ...defaultRules, effectiveMonth: period }, rulesConfigured: Boolean(rules), employees,
    rows: snapshot && !stale ? snapshot.rows : rows, status: stale ? 'draft' : snapshot?.status ?? 'draft',
    version: record?._version ?? 0, audit: snapshot?.audit ?? [], stale };
}

async function assertEditable(store: PayrollStore, period: string) {
  const row = await store.get(runId(period));
  if ((row?.payload as Snapshot | undefined)?.status === 'approved') throw new PayrollError(409, 'This payroll period is approved and locked.');
}
export async function saveProfile(profile: Profile) {
  await payrollWrite(async store => {
    await assertEditable(store, profile.effectiveMonth);
    if (!(await employeesFor(store, profile.effectiveMonth)).some(employee => employee.id === profile.employeeId)) {
      throw new PayrollError(400, 'Select a payroll-eligible employee for this month.');
    }
    const id = `profile:${profile.employeeId}:${profile.effectiveMonth}`;
    await store.put({ id, kind: 'profile', period: profile.effectiveMonth, employeeId: profile.employeeId, payload: profile }, await store.get(id));
  });
}
export async function saveRules(rules: Rules) {
  if (rules.taxMode === 'table01-2025-26' && (rules.effectiveMonth < '2025-04' || rules.effectiveMonth > '2026-03')) {
    throw new PayrollError(400, 'The 2025/26 reference applies from April 2025 to March 2026.');
  }
  await payrollWrite(async store => {
    await assertEditable(store, rules.effectiveMonth);
    const id = 'rules:' + rules.effectiveMonth;
    await store.put({ id, kind: 'rules', period: rules.effectiveMonth, payload: rules }, await store.get(id));
  });
}
export async function saveInput(period: string, input: Input) {
  await payrollWrite(async store => {
    await assertEditable(store, period);
    const rules = await effectiveRules(store, period);
    const { rows } = await prepareInputs(store, period, rules);
    const employee = rows.find(row => row.employeeId === input.employeeId);
    if (!employee) throw new PayrollError(404, 'An active salary profile is required.');
    if (input.otHours > employee.recordedOt) throw new PayrollError(400, 'Approved overtime cannot exceed completed attendance overtime.');
    const id = `input:${period}:${input.employeeId}`;
    await store.put({ id, kind: 'input', period, employeeId: input.employeeId,
      payload: { ...input, sourceFingerprint: employee.sourceFingerprint } }, await store.get(id));
  });
}

export async function changeRun(period: string, action: 'calculate' | 'submit' | 'approve' | 'return', version: number, actor: string) {
  return payrollWrite(async store => {
    const id = runId(period), record = await store.get(id), previous = record?.payload as Snapshot | undefined;
    if ((record?._version ?? 0) !== version) throw new PayrollError(409, 'The run changed. Refresh the payroll period.');
    if (previous?.status === 'approved') throw new PayrollError(409, 'This payroll period is approved and locked.');
    const rules = await effectiveRules(store, period);
    if (!rules) throw new PayrollError(400, 'Save the payroll rules for this period first.');
    if (rules.taxMode === 'table01-2025-26' && (period < '2025-04' || period > '2026-03')) {
      throw new PayrollError(400, 'Configure verified APIT inputs for this assessment year.');
    }
    const { rows } = await prepareInputs(store, period, rules);
    const current = fingerprint(rules, rows);
    if (!rows.length) throw new PayrollError(400, 'Add at least one active salary profile.');
    if (action !== 'return' && rows.some(row => row.issues.length || !row.amounts)) {
      throw new PayrollError(409, 'Resolve the items in Attendance inputs before proceeding.');
    }
    let next: Snapshot;
    if (action === 'calculate') {
      if (previous && previous.fingerprint === current) throw new PayrollError(409, 'This input snapshot is already calculated.');
      next = { status: 'calculated', rules, rows, fingerprint: current, calculatedBy: actor,
        audit: [...(previous?.audit ?? []).slice(-99), audit('Calculated', actor)] };
    } else {
      const status = action === 'submit' ? 'calculated' : 'submitted';
      if (!previous || previous.status !== status || (action !== 'return' && previous.fingerprint !== current)) {
        throw new PayrollError(409, 'The payroll inputs changed or the run is in a different stage. Refresh and calculate again.');
      }
      if (action === 'approve' && previous.calculatedBy === actor) {
        throw new PayrollError(403, 'A different payroll approver must approve this run.');
      }
      next = { ...previous, status: action === 'approve' ? 'approved' : action === 'submit' ? 'submitted' : 'calculated',
        audit: [...previous.audit.slice(-99), audit(action === 'approve' ? 'Approved' : action === 'submit' ? 'Submitted for approval' : 'Returned for review', actor)] };
    }
    if (Buffer.byteLength(JSON.stringify(next), 'utf8') > 350_000) throw new PayrollError(409, 'The payroll period exceeds the supported snapshot size.');
    const saved = await store.put({ id, kind: 'run', period, payload: next }, record);
    return { status: next.status, version: saved._version };
  });
}
