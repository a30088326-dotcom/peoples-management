import { Archive, BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardList, LayoutDashboard, LockKeyhole, MessageSquare, Target, TrendingUp, Users } from 'lucide-react';
import type { Section } from './types';

/** Shared by the Peoples Management sidebar and the performance page so hashes, labels and
 * active states cannot drift apart. The reference site uses three longer hashes. */
export const performanceNavigation = [
  { id: 'overview', label: 'Overview', hash: 'dashboard', icon: LayoutDashboard },
  { id: 'cycles', label: 'Review cycles', hash: 'cycles', icon: CalendarDays },
  { id: 'templates', label: 'Templates', hash: 'templates', icon: BookOpen },
  { id: 'employees', label: 'Employee reviews', hash: 'employees', icon: Users },
  { id: 'goals', label: 'Goals & check-ins', hash: 'goals', icon: Target },
  { id: 'self', label: 'Self-assessment', hash: 'self-review', icon: ClipboardList },
  { id: 'manager', label: 'Manager assessment', hash: 'manager-review', icon: CheckCircle2 },
  { id: 'feedback', label: '360° feedback', hash: 'feedback', icon: MessageSquare },
  { id: 'development', label: 'Development plan', hash: 'development', icon: TrendingUp },
  { id: 'close', label: 'Close review', hash: 'close', icon: LockKeyhole },
  { id: 'reports', label: 'Reports', hash: 'reports', icon: BarChart3 },
  { id: 'history', label: 'Historical records', hash: 'history', icon: Archive },
] as const satisfies ReadonlyArray<{ id: Section; label: string; hash: string; icon: typeof Target }>;

export function performanceSectionFromHash(hash: string): Section {
  const value = hash.replace(/^#/, '');
  return performanceNavigation.find(item => item.hash === value || item.id === value)?.id || 'overview';
}

export function performanceHash(section: Section): string {
  return performanceNavigation.find(item => item.id === section)?.hash || 'dashboard';
}
