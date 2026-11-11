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
  | 'self_service'
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

