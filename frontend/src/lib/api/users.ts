import { api, type ApiResponse, type ApiListResponse } from './client';
import type { OnboardingProfileData } from './onboarding';

export interface MemberData {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'CANDIDATE';
  isActive: boolean;
  createdAt: string;
  onboardingProfile?: OnboardingProfileData | null;
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
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/users/${id}`),
  update: (id: string, data: { name?: string; email?: string; newPassword?: string; role?: string }) =>
    api.patch<UserUpdateResponse>(`/api/users/${id}/update`, data, { timeout: 30000 }),
};
