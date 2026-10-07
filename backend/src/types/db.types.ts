export interface User {
  id: string;
  email: string;
  name: string;
  password?: string | null;
  role: 'ADMIN' | 'CANDIDATE' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  supervisorId?: string | null;
}

export interface OnboardingProfile {
  id: string;
  candidateId: string;
  firstName: string;
  lastName: string;
  city: string;
  dateOfBirth: Date;
  gender: string;
  nationality?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode?: string | null;
  phoneNumber: string;
  alternatePhone?: string | null;
  linkedIn?: string | null;
  emergencyContactName: string;
  emergencyContactRelation?: string | null;
  emergencyContactPhone: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invite {
  id: string;
  token: string;
  email: string;
  name: string;
  role: string;
  employmentType: string;
  designation: string;
  team: string;
  joinedDate: Date;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  declinedAt?: Date | null;
  invitedById: string;
  invitedUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  candidateId: string;
  title: string;
  templateContent: string;
  renderedContent: string;
  fieldValues: any;
  status: string;
  signatureUrl?: string | null;
  signedAt?: Date | null;
  signerIp?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  candidateId: string;
  type: string;
  label: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  status: string;
  rejectionNote?: string | null;
  verifiedById?: string | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  userId: string;
  employeeNo: string;
  isActive: boolean;
  barcodeNo?: string | null;
  payrollNo?: string | null;
  timeAndAttendanceActive: boolean;
  payrollActive: boolean;
  employeeStatus?: string | null;
  employeeGroup?: string | null;
  onboardingProfileId?: string | null;
  teamId?: string | null;
  employmentTypeId?: string | null;
  leaveWorkflowId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
