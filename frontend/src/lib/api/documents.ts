import { api } from './client';

export const documentsApi = {
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
