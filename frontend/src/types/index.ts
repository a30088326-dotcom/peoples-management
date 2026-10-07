// ─── Core Enums / Literals ──────────────────────────────────────────────────

export type Screen =
  | 'assistant'
  | 'assistant-admin'
  | 'performance'
  | 'dashboard'
  | 'invite'
  | 'invite-landing'
  | 'onboarding'
  | 'verification'
  | 'contract'
  | 'supervisor'
  | 'hub-onboarding'
  | 'advanced-eims'
  | 'self_service'
  | 'leave-hub'
  | 'attendance-hub'
  // New screens added to app:
  | 'access-control'
  | 'employee-information'
  | 'reporting-hierarchy'
  | 'leave-management'
  | 'attendance'
  | 'eim'
  | 'executive-request-center'
  | 'team-attendance';

export type UserRole = 'Admin' | 'Employee';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
// Backend sends: PENDING, ACCEPTED, DECLINED, EXPIRED
export type InviteStatus = 'Pending' | 'Accepted' | 'Declined' | 'Cancelled' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type OnboardingStep = 1 | 2 | 3 | 4;

// ─── Hierarchy Types ────────────────────────────────────────────────────────

export interface HierarchyEmployee {
  id: string;
  name: string;
  employeeNo?: string;
  designation?: string;
  department?: string;
  avatar?: string;
  userId?: string;
  reportingManagerId?: string | null;
}

// Flat node structure used by OrgChartNode & ReportingHierarchyHub
export interface HierarchyNode {
  id: string;
  name: string;
  employeeNo?: string;
  designation?: string;
  department?: string;
  status?: string;
  avatar?: string;
  hasChildren?: boolean;
  children?: HierarchyNode[];
  directReports?: HierarchyNode[];
  directReportsCount?: number;
  managerId?: string | null;
  reportingManagerId?: string | null;
  relationshipId?: string;
  // Nested employee sub-object (alternative structure)
  employee?: HierarchyEmployee;
}

export interface HierarchyAuditRecord {
  id: string;
  action: string;
  employeeName: string;
  employeeNo?: string;
  managerName: string;
  newManagerName?: string;
  previousManagerName?: string;
  changedBy: string;
  changed_by?: string;
  createdAt?: string;
  created_at?: string;
  effective_date?: string;
  reason?: string;
}

export interface AssignManagerPayload {
  employeeId: string;
  managerId: string;
}


// ─── People ─────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  team: string;
  employmentType: EmploymentType;
  joinedDate: string;
  avatarInitials: string;
  avatarColor: string;
  status: 'Active' | 'Onboarding' | 'Pending';
}

export interface PendingInvite {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  team: string;
  employmentType: EmploymentType;
  joinedDate: string;
  status: InviteStatus;
  sentAt: string;
  invitedBy: string;
}

// ─── Invite Form ─────────────────────────────────────────────────────────────

export interface InviteFormData {
  name: string;
  email: string;
  role: UserRole;
  employmentType: EmploymentType;
  designation: string;
  team: string;
  joinedDate: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id: string;
  key: string;
  label: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  status: DocumentStatus;
  color: string;
  previewUrl?: string;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
}

export interface ContactDetails {
  phoneNumber: string;
  alternatePhone: string;
  linkedIn: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

export interface BankDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CHECKING';
  currency: string;
}

// ─── Contract ───────────────────────────────────────────────────────────────

export interface ContractTemplate {
  id: string;
  title: string;
  content: string;
  tokens: string[];
  createdAt: string;
}

export interface ContractData {
  candidateName: string;
  designation: string;
  salary: string;
  startDate: string;
  signatureDataUrl?: string;
  signedAt?: string;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export interface NavItem {
  id: Screen;
  label: string;
  step: number;
  role: 'Admin' | 'Candidate';
  icon: string;
}
