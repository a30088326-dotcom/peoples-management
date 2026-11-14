import { randomUUID } from 'node:crypto';
import { repository, type RepositorySession } from '../../storage/repository';
import { processEntitlementsNative } from '../leave/entitlements.native';
import type { ConfirmationResult } from './confirmationService';
import { assertEmployee, isoDay } from './native-utils';
import { touchEimReferences } from '../eim/eim.dynamo.service';
import { findEmploymentLeaveGroup, isFixedTermEmployment } from '../leave/employment-leave-group';

export async function confirmPermanentNative(employeeId: string, effective: Date, actorId: string, session?: RepositorySession): Promise<ConfirmationResult> {
  const run = async (tx: RepositorySession): Promise<ConfirmationResult> => {
    await touchEimReferences(tx);
    const employee = await tx.get('employee_information_employees', { id: employeeId });
    assertEmployee(employee, 'Employee not found', 404);
    assertEmployee(employee.userId, 'Employee has no linked user account');
    assertEmployee(employee.dateJoined, 'Employee has no date of joining. Cannot calculate leave entitlements.');
    const employmentType = employee.employmentTypeId ? await tx.get('employment_types', { id: employee.employmentTypeId }) : undefined;
    const typeName = String(employmentType?.name ?? employee.employmentType ?? '');
    assertEmployee(Number(employee.isActive) === 1 && String(employee.employeeStatus || employee.status).toLowerCase() === 'active', 'Only active employees can be confirmed.');
    assertEmployee(employee.probationStatus === 'Probation' && !isFixedTermEmployment(typeName), 'Only employees on probation can be confirmed.', 409);
    const effectiveDay = isoDay(effective);
    assertEmployee(effectiveDay && effectiveDay >= String(employee.dateJoined).slice(0, 10), 'Permanent effective date cannot precede the joining date.');
    assertEmployee(effectiveDay <= new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10), 'Permanent effective date cannot be in the future.');
    const group = await findEmploymentLeaveGroup(tx, 'Permanent');
    assertEmployee(group, 'No active Permanent Leave Group found.');
    const legacyProbationType = typeName.trim().toLowerCase() === 'probation';
    const permanent = legacyProbationType
      ? (await tx.find('employment_types', t => Number(t.isActive) === 1 && String(t.name).trim().toLowerCase() === 'permanent'))[0]
      : undefined;
    const before = await tx.find('leave_entitlements', e => e.userId === employee.userId);
    await tx.replace('employee_information_employees', { ...employee, probationStatus: 'Confirmed', permanentEffectiveDate: effectiveDay, leaveGroupId: group.id,
      ...(legacyProbationType ? { employmentTypeId: permanent?.id ?? null, employmentType: permanent?.name ?? 'Permanent' } : {}) });
    const workstation = (await tx.find('employee_information_workstation_details', w => w.employeeId === employeeId))[0];
    if (workstation && legacyProbationType) await tx.replace('employee_information_workstation_details', { ...workstation, employmentTypeId: permanent?.id ?? null });
    const generated = await processEntitlementsNative(employeeId, tx, { assumeConfirmed: true });
    const year = Number(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 4));
    const leaveYear = (await tx.find('leave_years', y => Number(y.year) === year))[0]; assertEmployee(leaveYear, 'No active Leave Year found.');
    const types = await tx.find('leave_types', t => !!t.isActive), scripts = await tx.find('leave_rule_scripts', () => true);
    const entitlements: ConfirmationResult['entitlements'] = [], appliedScripts = [];
    for (const type of types) {
      const row = (await tx.find('leave_entitlements', e => e.userId === employee.userId && e.leaveTypeId === type.id && e.leaveYearId === leaveYear.id))[0];
      if (!row) continue;
      const old = before.find(e => e.leaveTypeId === type.id && e.leaveYearId === leaveYear.id);
      const total = Number(row.totalDays || 0), previous = Number(old?.totalDays || 0), used = Number(old?.usedDays || 0);
      entitlements.push({ leaveTypeId: type.id, leaveTypeCode: type.code, leaveTypeName: type.name, calculatedDays: total, alreadyGranted: previous, alreadyUsed: used, netNewEntitlement: Math.max(0, total - previous) });
      const scriptName = `${String(type.name).replace(/ /g, '_')}_Sri_Lanka`, script = scripts.find(s => String(s.name).toLowerCase() === scriptName.toLowerCase()) || scripts.find(s => !!s.isDefault);
      appliedScripts.push({ scriptName: script?.name || `Built-in ${type.code} Rule`, leaveType: type.code, calculatedEntitlement: total });
      await tx.replace('leave_entitlements', { ...row, leaveGroupId: group.id, status: 'PROCESSED', remarks: `Auto-calculated on confirmation. Previous: ${previous}, New: ${total}. Used leave retained: ${used}.` });
    }
    void generated;
    const transitionId = randomUUID();
    await tx.create('employee_information_employment_type_transitions', { id: transitionId, employeeId, previousEmploymentType: 'Probation', newEmploymentType: 'Permanent', effectiveDate: effectiveDay, previousLeaveGroupId: employee.leaveGroupId || before.find(e => e.leaveGroupId)?.leaveGroupId || null, newLeaveGroupId: group.id, appliedScripts, calculatedEntitlements: entitlements.map(e => ({ leaveTypeId: e.leaveTypeId, leaveTypeCode: e.leaveTypeCode, entitled: e.calculatedDays, alreadyUsed: e.alreadyUsed, netNew: e.netNewEntitlement })), performedBy: actorId });
    await tx.create('employee_information_audit_logs', { id: randomUUID(), employeeId, userId: actorId, action: 'CONFIRM_PERMANENT', fieldChanged: 'probationStatus', previousValue: employee.probationStatus || employee.employeeStatus || 'Probation', newValue: 'Permanent (Confirmed)' });
    return { success: true, employeeId, permanentEffectiveDate: new Date(`${effectiveDay}T00:00:00Z`), leaveGroupAssigned: group.name,
      ...(legacyProbationType ? { employmentTypeId: permanent?.id ?? null, employmentType: permanent?.name ?? 'Permanent' } : {}),
      entitlements, auditLogId: transitionId };
  };
  return session ? run(session) : repository().transaction(run);
}
