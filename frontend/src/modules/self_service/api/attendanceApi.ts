import { api } from '../../../lib/api/client';

export const attendanceApi = {
  getTodayAttendance: () => api.get('/api/attendance/my-today'),
  getAttendanceHistory: () => api.get('/api/attendance/my-attendance/history'),
  createManualAttendance: (data: { date: string; inTime: string; outTime: string }) => api.post('/api/attendance/my-attendance/manual', data),
  updateAttendance: (idOrDate: string, data: { inTime: string; outTime: string; date?: string }) => api.put(`/api/attendance/my-attendance/${idOrDate}`, data),
  punch: (data: { logType: 'In' | 'Out' | 'BreakIn' | 'BreakOut', source?: string, location?: string }) => api.post('/api/attendance/punch', data),
  getMyShift: () => api.get('/api/attendance/my-shift'),
  requestMissedAttendance: (data: { date: string; inTime: string; outTime: string; reason?: string; recordId?: string }) => api.post('/api/attendance/exceptions/missed-punch', data),
  getMyExceptions: () => api.get('/api/attendance/my-exceptions')
};
