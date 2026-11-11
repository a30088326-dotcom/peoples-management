import { api, type ApiResponse, type ApiListResponse } from './client';

export interface LeaveTypeData {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  allowHalfDays: boolean;
  requireCoveringEmp: boolean;
  yearlyEntitlement: number | string;
  needMedicalCertificate: boolean;
  maxDaysWithoutMedCert?: number | string;
  requireAttachment: boolean;
  isNoPayLeave: boolean;
  isMaternityLeave: boolean;
  carryForwardEnabled: boolean;
  carryForwardMaxDays?: number | string;
  showBalance: boolean;
  allowNegativeBalance?: boolean;
  showReason?: boolean;
  commentMandatory: boolean;
  maxDaysPerInstance?: number | string;
  noticePeriodDays?: number | string;
  autoCalculateEndDate?: boolean;
  holidaysCountAsLeave?: boolean;
  hideZeroEntitlement?: boolean;
  futureLeaveAllowed?: boolean;
  carryForwardLimit?: number | string;
  encashmentEnabled?: boolean;
  encashmentIsFixed?: boolean;
  encashmentValue?: number | string;
}

export interface LeaveYearData {
  id: string;
  year: number;
  displayName: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface LeaveEntitlementData {
  id: string;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
  earnedDays: number;
  transferDeactivated?: boolean;
  user?: { id: string; name: string; email: string };
  leaveType: LeaveTypeData;
  leaveYear?: LeaveYearData;
}

export interface LeaveApplicationData {
  id: string;
  status: 'PENDING' | 'PENDING_MANAGER_APPROVAL' | 'PENDING_HR_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVISING';
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDayType: 'NONE' | 'FIRST_HALF' | 'SECOND_HALF';
  reason?: string;
  subReason?: string;
  comments?: string;
  medCertSubmitted: boolean;
  medCertRefNo?: string;
  medCertIssuedDate?: string;
  attachmentUrl?: string;
  approvedAt?: string;
  rejectedReason?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  leaveType: { id: string; name: string; color: string; code: string };
  leaveYear: { id: string; year: number; displayName: string };
  approver?: { id: string; name: string; email: string } | null;
  coveringEmployee?: { id: string; name: string; email: string } | null;
}

export interface ApplyLeavePayload {
  attachmentUrl?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDayType?: 'NONE' | 'FIRST_HALF' | 'SECOND_HALF';
  reason?: string;
  subReason?: string;
  comments?: string;
  coveringEmployeeId?: string;
  medCertSubmitted?: boolean;
  medCertRefNo?: string;
  medCertIssuedDate?: string;
  applicantId?: string;
}

export interface TeamDashboardData {
  todaysAvailability: {
    total: number;
    present: number;
    absent: number;
    notRecorded: number;
    onLeave: { name: string; leaveType: string; leaveTypeColor: string }[];
  };
  next7Days: {
    date: string;
    dayName: string;
    present: number;
    absent: number;
    percentage: number;
  }[];
  bradfordFactor: {
    userId: string;
    name: string;
    email: string;
    episodes: number;
    totalDays: number;
    score: number;
    risk: 'Low' | 'Medium' | 'High' | 'Very High';
  }[];
  pendingApprovals: PendingApprovalData[];
  stats: {
    teamLeaveAvg: number;
    absenceRate: number;
    totalPendingCount: number;
    totalOnLeaveToday: number;
  };
}

export interface PendingApprovalData {
  attachmentUrl?:string;
  medCertSubmitted?:boolean;
  medCertRefNo?:string;
  medCertIssuedDate?:string;
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDayType: string;
  reason?: string;
  comments?: string;
  createdAt: string;
  applicant: { id: string; name: string; email: string };
  leaveType: { id: string; name: string; color: string; code: string };
  leaveYear: { id: string; year: number; displayName: string };
  coveringEmployee?: { id: string; name: string } | null;
  clashWarning: boolean;
  clashWith: string[];
}

export const leavesApi = {
  getTypes: () =>
    api.get<ApiResponse<LeaveTypeData[]>>('/api/leaves/types'),

  getEntitlements: (year?: number) =>
    api.get<ApiResponse<LeaveEntitlementData[]>>('/api/leaves/entitlements', {
      params: year ? { year } : undefined,
    }),

  getApplications: (params?: { status?: string; year?: number; page?: number; limit?: number }) =>
    api.get<ApiListResponse<LeaveApplicationData>>('/api/leaves/applications', { params }),

  getApplicationHistory: (id: string) =>
    api.get<ApiResponse<any[]>>(`/api/leaves/applications/${id}/history`),

  getCeoApplications: (params?: { pendingForMe?: boolean; page?: number; limit?: number }) =>
    api.get<ApiListResponse<LeaveApplicationData>>('/api/leaves/ceo/applications', { params }),

  apply: (data: ApplyLeavePayload) =>
    api.post<ApiResponse<LeaveApplicationData>>('/api/leaves/applications', data),

  approveApplication: (id: string, data: { action: 'APPROVED' | 'REJECTED'; rejectedReason?: string }) =>
    api.patch<ApiResponse<LeaveApplicationData>>(`/api/leaves/applications/${id}/approve`, data),

  cancel: (id: string, cancelReason?: string) =>
    api.patch<ApiResponse<LeaveApplicationData>>(`/api/leaves/applications/${id}/cancel`, { cancelReason }),

  approveOrReject: (id: string, action: 'APPROVED' | 'REJECTED', rejectedReason?: string) =>
    api.patch<ApiResponse<LeaveApplicationData>>(`/api/leaves/applications/${id}/approve`, { action, rejectedReason }),

  getTeamDashboard: () =>
    api.get<ApiResponse<TeamDashboardData>>('/api/leaves/team/dashboard'),
};
