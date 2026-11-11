import { api, type ApiResponse, type ApiListResponse } from './client';
import type { UserInfo } from './auth';

export interface InviteData {
  id: string;
  token: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CANDIDATE';
  employmentType: string;
  designation: string;
  team: string;
  joinedDate: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  sentAt?: string;
  createdAt: string;
  expiresAt: string;
  invitedBy?: { id: string; name: string; email: string };
  invitedUserId?: string;
}

export interface CreateInvitePayload {
  name: string;
  email: string;
  role: 'ADMIN' | 'CANDIDATE';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  designation: string;
  team: string;
  joinedDate: string;
}

export interface EmailDelivery {
  sent: boolean;
  reason?: string;
}

export const invitesApi = {
  create: (data: CreateInvitePayload) =>
    api.post<ApiResponse<{ invite: InviteData; inviteLink: string; delivery?: EmailDelivery }>>('/api/invites', data),
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ApiListResponse<InviteData>>('/api/invites', { params }),
  getByToken: (token: string) =>
    api.get<ApiResponse<InviteData>>(`/api/invites/${token}`),
  accept: (token: string, password?: string) =>
    api.post<ApiResponse<{ user: UserInfo; token: string }>>(`/api/invites/${token}/accept`, { password }),
  decline: (token: string) =>
    api.post<ApiResponse<null>>(`/api/invites/${token}/decline`),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/invites/${id}`),
  resend: (id: string) =>
    api.post<ApiResponse<{ id: string; delivery?: EmailDelivery }>>(`/api/invites/${id}/resend`),
};
