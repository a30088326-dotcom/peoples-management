import { api } from '@/lib/api';

export interface Shift {
  id: string;
  createdAt?: string;
  code: string;
  name: string;
  description?: string;
  shiftType: 'Fixed' | 'Rotating' | 'Flexible' | 'Split';
  startTime: string;
  endTime: string;
  crossMidnight: boolean;
  totalHours: number;
  minWorkingHours?: number;
  fullDayHours?: number;
  halfDayHours?: number;
  breakDuration?: number;
  breakType: 'Paid' | 'Unpaid';
  earliestIn?: string;
  latestOut?: string;
  graceLate: number;
  graceEarly: number;
  overtimeEligible: boolean;
  overtimeStart: number;
  weeklyWorkingDays: string[];
  weeklyOffDays: string[];
  holidayRule: 'Normal' | 'Overtime' | 'Off';
  applicableEmploymentTypes: string[];
  status: 'Active' | 'Inactive' | 'Archived';
}

export type ShiftPayload = Partial<Shift> & {
  allowDuplicateCode?: boolean;
};

export interface RosterGroupShift {
  id: string;
  groupId: string;
  shiftId: string;
  isDefault: boolean;
  displayOrder: number;
  // Included from join
  code?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  weeklyWorkingDays?: string | string[];
  weeklyOffDays?: string | string[];
}

export interface RosterGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  departmentId?: string;
  branchId?: string;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  rosterCycle: 'Weekly' | 'Biweekly' | 'Monthly' | 'Custom';
  applicableEmploymentTypes: string[];
  minRestHours: number;
  maxConsecutiveDays: number;
  maxWeeklyHours?: number;
  status: 'Draft' | 'Active' | 'Inactive' | 'Archived';
  shifts?: RosterGroupShift[];
  employeeCount?: number;
  departmentName?: string;
  calendarAssignments?: { date: string; shiftId: string | null; isOffDay: boolean }[];
}

export type RosterGroupPayload = Omit<Partial<RosterGroup>, 'shifts' | 'calendarAssignments'> & {
  shifts?: { shiftId: string; isDefault: boolean; displayOrder: number }[];
  calendarAssignments?: { date: string; shiftId: string | null; isOffDay: boolean; clear?: boolean }[];
};

export const attendanceApi = {
  // Shifts
  getShifts: (includeArchived = false) => api.get<{ success: boolean; data: Shift[] }>(`/api/attendance/shifts${includeArchived ? '?includeArchived=true' : ''}`),
  createShift: (data: ShiftPayload) => api.post('/api/attendance/shifts', data),
  updateShift: (id: string, data: Partial<Shift>) => api.put(`/api/attendance/shifts/${id}`, data),
  deleteShift: (id: string, entireCode = false) => api.delete<{ success: boolean; message: string }>(`/api/attendance/shifts/${id}${entireCode ? '?scope=code' : ''}`),

  // Roster Groups
  getRosterGroups: () => api.get<{ success: boolean; data: RosterGroup[] }>('/api/attendance/roster-groups'),
  createRosterGroup: (data: RosterGroupPayload) => api.post('/api/attendance/roster-groups', data),
  updateRosterGroup: (id: string, data: RosterGroupPayload) => api.put(`/api/attendance/roster-groups/${id}`, data),
  deleteRosterGroup: (id: string) => api.delete<{ success: boolean; message: string }>(`/api/attendance/roster-groups/${id}`),

  // Assignments
  getAssignments: () => api.get('/api/attendance/assignments'),
  assignEmployees: (data: ({ employeeIds: string[]; departmentId?: never } | { departmentId: string; employeeIds?: never }) & { groupId: string; effectiveStartDate: string; effectiveEndDate?: string }) =>
    api.post<{ success: boolean; message: string; data: { assignedCount: number; departmentId: string | null; departmentName?: string } }>('/api/attendance/assignments', data),

  // Records & Dashboards
  getDashboardStats: () => api.get('/api/attendance/dashboard'),
  getRecords: () => api.get('/api/attendance/records'),
  getExceptions: () => api.get('/api/attendance/exceptions'),
};
