import { api, type ApiResponse } from './client';

export interface ContractData {
  id: string;
  title: string;
  templateContent: string;
  renderedContent: string;
  fieldValues: Record<string, string>;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED';
  signatureUrl?: string | null;
  signedAt?: string | null;
  candidateId: string;
  candidate?: { id: string; name: string; email: string };
  createdAt: string;
}

export interface CreateContractPayload {
  candidateId: string;
  title: string;
  templateContent: string;
  fieldValues: Record<string, string>;
}

export const contractsApi = {
  create: (data: CreateContractPayload) =>
    api.post<ApiResponse<ContractData>>('/api/contracts', data),
  update: (id: string, data: Pick<CreateContractPayload, 'templateContent' | 'fieldValues'>) =>
    api.put<ApiResponse<ContractData>>(`/api/contracts/${id}`, data),
  list: () =>
    api.get<ApiResponse<ContractData[]>>('/api/contracts'),
  sign: (id: string, signatureDataUrl: string) =>
    api.post<ApiResponse<ContractData>>(`/api/contracts/${id}/sign`, { signatureDataUrl }),
  sendLink: (id: string) =>
    api.post<ApiResponse<void>>(`/api/contracts/${id}/send-link`),
};
