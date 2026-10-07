import type { Section, Workspace } from './types';

const adminSections: Section[] = ['overview', 'cycles', 'templates', 'employees', 'goals', 'self', 'manager', 'feedback', 'development', 'close', 'reports', 'history'];
const managerSections: Section[] = ['overview', 'employees', 'goals', 'manager', 'feedback', 'development', 'close', 'reports', 'history'];
const employeeSections: Section[] = ['overview', 'goals', 'self', 'development'];

export function sectionsFor(data: Workspace): Section[] {
  if (data.actor.admin || data.actor.executive) return adminSections;
  if (data.actor.manager) {
    const sections = [...managerSections];
    // Reporting managers are employees too; keep their own self-review available.
    if (data.reviews.some(review => review.employeeId === data.actor.employeeId)) sections.splice(3, 0, 'self');
    return sections;
  }
  const sections = [...employeeSections];
  if (data.invitations.length) sections.push('feedback');
  return sections;
}
