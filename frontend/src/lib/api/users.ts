import { api, type ApiResponse, type ApiListResponse } from './client';

export interface MemberData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CANDIDATE';
  isActive: boolean;
  createdAt: string;
  onboardingProfile?: { firstName: string; lastName: string; city: string } | null;
  receivedInvite?: { designation: string; team: string; employmentType: string; joinedDate: string } | null;
  documents?: { status: string }[];
  contract?: { status: string } | null;
  employee?: { id: string; employeeStatus: string | null; employeeNo: string | null } | null;
}

export interface UserUpdateResponse {
  success: boolean;
  message: string;
  recipient?: string;
  delivery?: { sent: boolean; reason?: string };
}

export const usersApi = {
  list: (params?: { role?: string; page?: number; limit?: number }) =>
    api.get<ApiListResponse<MemberData>>('/api/users', { params }),
  me: () =>
    api.get<ApiResponse<MemberData>>('/api/users/me'),
  getById: (id: string) =>
    api.get<ApiResponse<MemberData>>(`/api/users/${id}`),
  deactivate: (id: string) =>
    api.patch<ApiResponse<null>>(`/api/users/${id}/deactivate`),
  activate: (id: string) =>
    api.patch<ApiResponse<null>>(`/api/users/${id}/activate`),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    api.patch<ApiResponse<null>>(`/api/users/${id}/reset-password`, { newPassword }),
  update: (id: string, data: { name?: string; email?: string; newPassword?: string; role?: string }) =>
    api.patch<UserUpdateResponse>(`/api/users/${id}/update`, data, { timeout: 30000 }),
};
