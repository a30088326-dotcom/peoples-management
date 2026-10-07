import { api } from '../../../lib/api/client';
import type { Workspace, Review, Template, Cycle, LibraryGoal, HistoricalPerformance } from '../types';
const base = '/api/performance';
export const performanceApi = {
  workspace: async (): Promise<Workspace> => (await api.get(`${base}/workspace`)).data.data,
  history: async (): Promise<HistoricalPerformance> => (await api.get(`${base}/history`)).data.data,
  review: async (id: string): Promise<Review> => (await api.get(`${base}/reviews/${id}`)).data.data,
  action: async (id: string, version: number, action: string, payload?: unknown) => api.post(`${base}/reviews/${id}/actions`, { version, action, payload }),
  saveTemplate: (data: Template, create = false) => create ? api.post(`${base}/templates`, data) : api.put(`${base}/templates/${data.id}`, data),
  publishTemplate: (id: string) => api.post(`${base}/templates/${id}/publish`),
  deleteTemplate: (id: string) => api.delete(`${base}/templates/${id}`),
  saveCycle: (data: Cycle, create = false) => create ? api.post(`${base}/cycles`, data) : api.put(`${base}/cycles/${data.id}`, data),
  cycleAction: (id: string, action: string) => api.post(`${base}/cycles/${id}/${action}`),
  saveGoal: (data: LibraryGoal, create = false) => create ? api.post(`${base}/library`, data) : api.put(`${base}/library/${data.id}`, data),
  deleteGoal: (id: string) => api.delete(`${base}/library/${id}`),
  assign: (data: { cycleId: string; goalIds: string[]; employeeIds: string[]; dueDate: string }) => api.post(`${base}/assign-goals`, data),
  readNotification: (id: string) => api.post(`${base}/notifications/${id}/read`),
};
