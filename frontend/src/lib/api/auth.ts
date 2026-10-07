import { api } from './client';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CANDIDATE' | 'SUPER_ADMIN' | 'EMPLOYEE';
  permissions?: any[];
  isActive: boolean;
  isManager?: boolean;
  isExecutive?: boolean;
  isOwner?: boolean;
  organizationalRank?: string | null;
  employeeId?: string | null;
  mustChangePassword?: boolean;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; token: string; user: UserInfo }>('/api/auth/login', { email, password }),
  me: () =>
    api.get<{ success: boolean; user: UserInfo }>('/api/auth/me'),
};

