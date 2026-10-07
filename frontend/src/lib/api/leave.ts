import { api as apiClient } from './client';

export const leaveApi = {
  generateEntitlements: async (employeeId: string) => {
    const res = await apiClient.post(`/api/leave-management/employee/${employeeId}/generate-entitlements`);
    return res.data;
  },
  
  getEntitlementsReport: async () => {
    const res = await apiClient.get('/api/leave-management/reports/entitlements');
    return res.data;
  },

  // Employee Workspace (Hub A)
  getEntitlements: async (userId?: string) => {
    const params = userId ? { userId } : {};
    const res = await apiClient.get('/api/leaves/entitlements', { params });
    return res.data;
  },

  getApplications: async (status?: string) => {
    const params = status ? { status } : {};
    const res = await apiClient.get('/api/leaves/applications', { params });
    return res.data;
  },

  applyLeave: async (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    applicantId?: string;
  }) => {
    const res = await apiClient.post('/api/leaves/applications', data);
    return res.data;
  },

  // Manager Workspace (Hub B)
  getTeamDashboard: async () => {
    const res = await apiClient.get('/api/leaves/team/dashboard');
    return res.data;
  },

  reviewApplication: async (id: string, action: 'APPROVED' | 'REJECTED', rejectedReason?: string) => {
    const res = await apiClient.patch(`/api/leaves/applications/${id}/approve`, {
      action,
      rejectedReason
    });
    return res.data;
  },

  // Admin Config Workspace (Hub C)
  createLeaveType: async (data: any) => {
    const res = await apiClient.post('/api/leaves/types', data);
    return res.data;
  },

  saveWorkflows: async (data: any) => {
    const res = await apiClient.post('/api/leaves/workflows', data);
    return res.data;
  },

  // Company Settings & Attendance (Hub D)
  saveCompanySettings: async (data: any) => {
    const res = await apiClient.post('/api/leaves/company/settings', data);
    return res.data;
  },

  createTeam: async (data: any) => {
    const res = await apiClient.post('/api/leaves/company/teams', data);
    return res.data;
  },

  createShift: async (data: any) => {
    const res = await apiClient.post('/api/leaves/attendance/shifts', data);
    return res.data;
  },
};

