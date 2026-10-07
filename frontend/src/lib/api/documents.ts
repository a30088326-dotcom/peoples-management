import { api } from './client';

export const documentsApi = {
  // Passports & Other Articles
  getArticles: (employeeId: string) => api.get(`/documents/articles/emp/${employeeId}`),
  saveArticle: (employeeId: string, data: any) => api.post(`/documents/articles/emp/${employeeId}`, data),
  deleteArticle: (id: string) => api.delete(`/documents/articles/${id}`),

  // Attachments
  getAttachments: (employeeId: string) => api.get(`/documents/attachments/emp/${employeeId}`),
  saveAttachment: (employeeId: string, data: FormData) => api.post(`/documents/attachments/emp/${employeeId}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAttachment: (id: string, data: FormData) => api.put(`/documents/attachments/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAttachment: (id: string) => api.delete(`/documents/attachments/${id}`),

  // Onboarding Uploads
  upload: (file: File, documentType: string, label: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('label', label);
    return api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  list: (candidateId?: string) => 
    api.get('/api/documents', { params: { candidateId } }),

  verify: (id: string, status: 'APPROVED' | 'REJECTED', rejectionNote?: string) =>
    api.patch(`/api/documents/${id}/verify`, { status, rejectionNote }),

  sendReuploadLink: (id: string) =>
    api.post(`/api/documents/${id}/request-reupload`),
};
