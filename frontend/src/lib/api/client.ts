import axios, { CanceledError } from 'axios';
import { canRetryRead, waitForReadRetry } from './requestRecovery';

// ─── Base Instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Prevent browser caching which causes ghost data when switching users (like candidates accepting invites)
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';
  return config;
});

// ─── Response Interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const requestAuthorization = String(config?.headers?.Authorization || '');
    const currentAuthorization = () => {
      const token = localStorage.getItem('hr_token');
      return token ? `Bearer ${token}` : '';
    };
    const attempts = Number(config?._hrReadRetries || 0);
    if (requestAuthorization === currentAuthorization() && canRetryRead(error, attempts)) {
      await waitForReadRetry(attempts, config.signal);
      if (requestAuthorization !== currentAuthorization()) throw new CanceledError('The session changed.');
      return api.request({ ...config, _hrReadRetries: attempts + 1 } as typeof config);
    }
    if (requestAuthorization === currentAuthorization() && error.response?.status === 401 && error.config?.url !== '/api/auth/login') {
      localStorage.removeItem('hr_token');
      localStorage.removeItem('hr_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
