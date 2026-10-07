import { api } from './client';

export const eimsApi = {
  getEmployees: () => api.get('/api/employee_information/audit'),
  getEmployeeById: (id: string) => api.get(`/api/employee_information/audit/${id}`),
  getMyEmployee: () => api.get('/api/employee_information/audit/me'),
  checkEmployeeNo: (empNo: string) => api.get(`/api/employee_information/audit/check-no/${empNo}`),
  createEmployee: (data: any) => api.post('/api/employee_information/audit', data),
  updateEmployee: (id: string, data: any) => api.put(`/api/employee_information/audit/${id}`, data),
  uploadAttachments: (employeeId: string, formData: FormData) => api.post(`/api/employee_information/audit/attachments/${employeeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAttachments: (employeeId: string) => api.get(`/api/employee_information/audit/attachments/${employeeId}`),
  deleteAttachment: (id: string) => api.delete(`/api/employee_information/audit/attachments/${id}`),
  uploadProfilePicture: (formData: FormData) => api.post('/api/employee_information/audit/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  convertCandidate: (candidateId: string) => api.post(`/api/employee_information/audit/convert/${candidateId}`),

  // Probation → Permanent Confirmation
  confirmPermanent: (employeeId: string, permanentEffectiveDate: string) =>
    api.post(`/api/employee_information/audit/confirm-permanent/${employeeId}`, { permanentEffectiveDate }),
  getTransitionLog: (employeeId: string) =>
    api.get(`/api/employee_information/audit/transition-log/${employeeId}`),

  // Attendance master data
  getRosterGroups: () => api.get('/api/attendance/roster-groups'),
  getShifts: () => api.get('/api/attendance/shifts'),
};
