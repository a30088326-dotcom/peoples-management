import { api as apiClient } from './client';

export const leaveApi = {
  getEntitlementsReport: async () => {
    const res = await apiClient.get('/api/leave-management/reports/entitlements');
    return res.data;
  },
};

