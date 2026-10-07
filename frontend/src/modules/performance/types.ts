export interface Employee {
  id: string; name: string; employeeNumber: string; department: string; designation: string;
  managerId: string | null; managerName: string; active: boolean; hasLogin?: boolean;
}
export interface Question { id: string; section: string; prompt: string; required: boolean }
export interface Competency { id: string; name: string; description: string; weight: number }
export interface Template {
  id: string; name: string; description: string; published: boolean; goalWeight: number;
  competencies: Competency[]; questions: Question[];
}
export interface Cycle {
  demo?: boolean;
  id: string; name: string; description: string; startDate: string; endDate: string;
  selfDeadline: string; managerDeadline: string; templateId: string; employeeIds: string[];
  feedbackRequired: boolean; developmentRequired: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'; createdAt: string;
}
export interface Milestone { id: string; title: string; weight: number; complete: boolean }
export interface LibraryGoal { id: string; title: string; measure: string; weight: number; milestones: Milestone[] }
export interface Goal extends LibraryGoal {
  libraryId: string; dueDate: string; progress: number; evidence: string;
  checkIns: { id: string; at: string; by: string; progress: number; comment: string; blockers: string }[];
}
export interface Assessment {
  answers: Record<string, string>; goalRatings: Record<string, number>;
  competencyRatings: Record<string, number>; comment: string; sharedAt: string | null;
  overallRating?: number;
}
export interface Feedback {
  id: string; reviewerId: string; relationship: string; dueDate: string;
  status: 'PENDING' | 'SUBMITTED' | 'DECLINED'; strengths: string; improvements: string;
  rating: number | null; submittedAt: string | null;
}
export interface DevelopmentAction { id: string; title: string; description: string; ownerId: string; dueDate: string; status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' }
export interface CareerDirection { targetRole: string; timeframe: string; strengths: string[]; growthAreas: string[]; successEvidence: string[] }
export interface Review {
  id: string; cycleId: string; employeeId: string; template: Template; goals: Goal[];
  self: Assessment; manager: Assessment; feedback: Feedback[]; development: DevelopmentAction[]; careerDirection?: CareerDirection;
  meetingDate: string | null; meetingNotes: string; closedAt: string | null;
  acknowledgedAt: string | null; finalScore: number | null; version: number; updatedAt: string;
  employee?: Employee; cycle: Cycle; canManage: boolean; isOwner: boolean; progress: number;
  scores: { goals: number; competencies: number; total: number } | null;
  closureProblems: string[]; history: { id: string; event: string; at: string }[];
}
export interface ReviewSummary {
  id: string; cycleId: string; employeeId: string; employee?: Employee; cycleName: string;
  selfSharedAt: string | null; managerSharedAt: string | null; closedAt: string | null;
  acknowledgedAt: string | null; progress: number; goals: number; dueDate: string;
  score: number | null; pendingFeedback: number; receivedFeedback: number;
  developmentActions: number; completedActions: number; updatedAt: string; canManage: boolean;
}
export interface Invitation extends Feedback {
  reviewId: string; version: number; employeeName: string; cycleName: string; closed: boolean; managerComment: string;
}
export interface Workspace {
  actor: { employeeId: string | null; admin: boolean; executive: boolean; manager: boolean };
  employees: Employee[]; cycles: Cycle[]; templates: Template[]; library: LibraryGoal[];
  reviews: ReviewSummary[]; invitations: Invitation[];
  notifications: { id: string; reviewId: string; message: string; readAt: string | null; at: string }[];
}
export interface HistoricalPerformance {
  cycles: { id: string; name: string; description: string | null; startDate: string; endDate: string; status: string }[];
  reviews: { id: string; cycleId: string; employeeId: string; employee: Employee | null; reviewerName: string;
    selfAssessment: string | null; managerReview: string | null; managerScore: number | null;
    employeeScore: number | null; status: string; submittedAt: string | null; reviewedAt: string | null; closedAt: string | null }[];
  goals: { id: string; cycleId: string; employeeId: string; employeeName: string; title: string; description: string | null;
    target: string | null; progress: number; status: string; category: string | null; priority: string | null;
    dueDate: string | null; successMeasurement: string | null }[];
  checkIns: { id: string; goalId: string; checkInDate: string; progress: number; status: string;
    comment: string | null; blocker: string | null; supportRequired: string | null }[];
  feedback: { id: string; cycleId: string; employeeId: string; employeeName: string; feedback: string; createdAt: string }[];
  development: { id: string; cycleId: string; employeeId: string; employeeName: string; area: string;
    actionPlan: string; targetDate: string; status: string }[];
}
export type Section = 'overview' | 'cycles' | 'templates' | 'employees' | 'goals' | 'self' | 'manager' | 'feedback' | 'development' | 'close' | 'reports' | 'history';
export type RunAction = (operation: () => Promise<unknown>, message: string) => Promise<boolean>;
export type ReviewAction = (action: string, payload?: unknown) => Promise<boolean>;
