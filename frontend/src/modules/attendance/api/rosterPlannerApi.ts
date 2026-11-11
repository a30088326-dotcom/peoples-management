import { api, type ApiResponse } from '@/lib/api/client';

export type Repeat = 'none' | 'weekly' | 'biweekly' | 'monthly';
export const repeatLabels: Record<Repeat, string> = {
  none: 'Do Not Repeat', weekly: 'Every Week', biweekly: 'Every 2 Weeks', monthly: 'Every Month',
};
export const slotCounts: Record<Repeat, number> = { none: 7, weekly: 7, biweekly: 14, monthly: 31 };
export type Staff = { id: string; name: string; employeeNumber: string; departmentId: string; department: string; designation: string };
export type ShiftOption = { id: string; name: string; startTime: string; endTime: string; overnight: boolean };
export type RosterDraft = {
  name: string; startDate: string; endDate: string; repeat: Repeat;
  employees: { employeeId: string; shifts: string[] }[];
};
export type RosterSummary = Omit<RosterDraft, 'employees'> & {
  id: string; version: number; employeeCount: number; status: 'Draft' | 'Published';
};
export type RosterDetail = RosterDraft & Pick<RosterSummary, 'id' | 'version' | 'status'>;
export type RosterOptions = {
  employees: Staff[]; departments: { id: string; name: string }[]; shifts: ShiftOption[];
  rosters: RosterSummary[]; legacy: { id: string; name: string }[];
};
export type CalendarCell = {
  date: string; leave: boolean; lock?: string; rosterId?: string; rosterName?: string; version?: number;
  shiftId?: string; source?: 'pattern' | 'occurrence' | 'future' | 'legacy'; shift?: ShiftOption; editable?: boolean; issues?: string[];
};
export type RosterCalendarData = { preview: boolean; days: { date: string; holidays: string[] }[]; employees: (Staff & { cells: CalendarCell[] })[] };
export type ShiftScope = 'occurrence' | 'future' | 'pattern';
type Saved = { id: string; version: number };
export type Conflict = { employeeId: string; date: string; message: string };

const endpoint = '/api/attendance/roster-plans';
export const rosterPlannerApi = {
  options: (signal?: AbortSignal) => api.get<ApiResponse<RosterOptions>>(endpoint, { signal }),
  detail: (id: string) => api.get<ApiResponse<RosterDetail>>(`${endpoint}/${id}`),
  save: (draft: RosterDraft, previous?: Pick<RosterDetail, 'id' | 'version'>) => previous
    ? api.put<ApiResponse<Saved>>(`${endpoint}/${previous.id}`, { draft, version: previous.version })
    : api.post<ApiResponse<Saved>>(endpoint, draft),
  publish: (id: string, version: number) => api.post<ApiResponse<Saved>>(`${endpoint}/${id}/publish`, { version }),
  change: (id: string, data: { employeeId: string; date: string; shiftId: string; scope: ShiftScope; version: number }) =>
    api.patch<ApiResponse<Saved>>(`${endpoint}/${id}/shift`, data),
  calendar: (params: { from: string; to: string; rosterId?: string; departmentId?: string }, signal: AbortSignal) =>
    api.get<ApiResponse<RosterCalendarData>>(`${endpoint}/calendar`, { params, signal }),
};

export function rosterFailure(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string; conflicts?: Conflict[] } } })?.response?.data;
  return { message: data?.message || fallback, conflicts: Array.isArray(data?.conflicts) ? data.conflicts : [] };
}
