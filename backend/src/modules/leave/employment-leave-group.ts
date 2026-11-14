import type { RepositorySession } from '../../storage/repository';

export function isFixedTermEmployment(name: unknown) {
  return /\b(contract|temporary|intern|internship|seasonal)\b/i.test(String(name ?? ''));
}

export function initialProbationStatus(employmentType: unknown) {
  return isFixedTermEmployment(employmentType) ? 'Active' : 'Probation';
}

export async function findEmploymentLeaveGroup(tx: RepositorySession, stage: 'Probation' | 'Permanent') {
  const label = stage.toLowerCase();
  const code = `LG-${stage.toUpperCase()}`;
  const groups = await tx.find('leave_groups', group => !!Number(group.isActive));
  return groups.find(group => String(group.code ?? '').trim().toUpperCase() === code)
    ?? groups.find(group => String(group.employmentType ?? '').trim().toLowerCase() === label);
}
