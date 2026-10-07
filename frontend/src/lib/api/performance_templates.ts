import axios from 'axios';
// (Assuming standard project API client setup, we can just use raw fetch or axios. Assuming /api prefix for now).

const API_BASE = '/api/performance';

// Templates
export const getReviewTemplates = async () => {
  const res = await axios.get(`${API_BASE}/cycle-review-templates`);
  return res.data;
};

export const createReviewTemplate = async (data: { name: string; description?: string }) => {
  const res = await axios.post(`${API_BASE}/cycle-review-templates`, data);
  return res.data;
};

export const getReviewTemplateById = async (id: string) => {
  const res = await axios.get(`${API_BASE}/cycle-review-templates/${id}`);
  return res.data;
};

export const updateReviewTemplate = async (id: string, data: { name?: string; description?: string }) => {
  const res = await axios.put(`${API_BASE}/cycle-review-templates/${id}`, data);
  return res.data;
};

export const getReviewTemplatePreview = async (id: string) => {
  const res = await axios.get(`${API_BASE}/cycle-review-templates/${id}/preview`);
  return res.data;
};

// Sections
export const createTemplateSection = async (templateId: string, data: any) => {
  const res = await axios.post(`${API_BASE}/cycle-review-templates/${templateId}/sections`, data);
  return res.data;
};

export const updateTemplateSection = async (templateId: string, sectionId: string, data: any) => {
  const res = await axios.put(`${API_BASE}/cycle-review-templates/${templateId}/sections/${sectionId}`, data);
  return res.data;
};

export const deleteTemplateSection = async (templateId: string, sectionId: string) => {
  const res = await axios.delete(`${API_BASE}/cycle-review-templates/${templateId}/sections/${sectionId}`);
  return res.data;
};

// Questions
export const createTemplateQuestion = async (templateId: string, data: any) => {
  const res = await axios.post(`${API_BASE}/cycle-review-templates/${templateId}/questions`, data);
  return res.data;
};

export const updateTemplateQuestion = async (templateId: string, questionId: string, data: any) => {
  const res = await axios.put(`${API_BASE}/cycle-review-templates/${templateId}/questions/${questionId}`, data);
  return res.data;
};

export const deleteTemplateQuestion = async (templateId: string, questionId: string) => {
  const res = await axios.delete(`${API_BASE}/cycle-review-templates/${templateId}/questions/${questionId}`);
  return res.data;
};

// Actions
export const validateReviewTemplateForPublish = async (templateId: string) => {
  const res = await axios.post(`${API_BASE}/cycle-review-templates/${templateId}/validate`);
  return res.data;
};

export const publishReviewTemplate = async (templateId: string) => {
  const res = await axios.post(`${API_BASE}/cycle-review-templates/${templateId}/publish`);
  return res.data;
};

export const duplicateReviewTemplate = async (templateId: string) => {
  const res = await axios.post(`${API_BASE}/cycle-review-templates/${templateId}/duplicate`);
  return res.data;
};
