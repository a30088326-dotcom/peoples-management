import { api, type ApiResponse } from './client';

export interface OnboardingProfileData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  phoneNumber: string;
  alternatePhone?: string;
  linkedIn?: string;
  emergencyContactName: string;
  emergencyContactRelation?: string;
  emergencyContactPhone: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  candidateId: string;
}

export interface OnboardingPayload {
  firstName: string; lastName: string; dateOfBirth: string; gender: string;
  nationality?: string; addressLine1: string; addressLine2?: string;
  city: string; postalCode?: string; phoneNumber: string; alternatePhone?: string;
  linkedIn?: string; emergencyContactName: string; emergencyContactRelation?: string;
  emergencyContactPhone: string; bankName: string; accountHolderName: string;
  accountNumber: string; accountType: 'SAVINGS' | 'CHECKING';
  currency: string;
}

export const onboardingApi = {
  submit: (data: OnboardingPayload) =>
    api.post<ApiResponse<OnboardingProfileData>>('/api/onboarding', data),
  get: () =>
    api.get<ApiResponse<OnboardingProfileData | null>>('/api/onboarding'),
};
