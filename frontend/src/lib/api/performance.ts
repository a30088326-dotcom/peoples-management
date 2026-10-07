import { api as apiClient } from './client';

export interface CreateCycleDto {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  template_id?: string | null;
  frequency?: string | null;
  self_assessment_deadline?: string | null;
  manager_assessment_deadline?: string | null;
  completion_date?: string | null;
  overall_score_enabled?: boolean;
  feedback_360_enabled?: boolean;
  automatic_reminders?: boolean;
  exclude_probation?: boolean;
  exclude_new_joiners?: boolean;
  exclude_notice_period?: boolean;
}

export const performanceApi = {
  getPerformanceCycles: async () => {
    const res = await apiClient.get('/api/performance/cycles');
    return res.data;
  },

  getPerformanceCycle: async (id: string) => {
    const res = await apiClient.get(`/api/performance/cycles/${id}`);
    return res.data;
  },

  createPerformanceCycle: async (data: CreateCycleDto) => {
    const res = await apiClient.post('/api/performance/cycles', data);
    return res.data;
  },

  updatePerformanceCycle: async (id: string, data: Partial<CreateCycleDto>) => {
    const res = await apiClient.put(`/api/performance/cycles/${id}`, data);
    return res.data;
  },

  activatePerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/activate`);
    return res.data;
  },

  completePerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/complete`);
    return res.data;
  },

  cancelPerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/cancel`);
    return res.data;
  },

  // === PHASE 2 TRANSITIONS ===
  publishPerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/publish`);
    return res.data;
  },
  startPerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/start`);
    return res.data;
  },
  closingPerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/closing`);
    return res.data;
  },
  closePerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/close`);
    return res.data;
  },
  archivePerformanceCycle: async (id: string) => {
    const res = await apiClient.post(`/api/performance/cycles/${id}/archive`);
    return res.data;
  },
  previewEligibility: async (data: any) => {
    const res = await apiClient.post(`/api/performance/cycles/preview`, data);
    return res.data;
  }
};

export type PerformanceGoalStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PerformanceGoal {
  id: string;
  performance_cycle_id: string;
  employee_id: string;
  title: string;
  description: string | null;
  target: string;
  progress: number;
  status: PerformanceGoalStatus;
  employee_comment: string | null;
  manager_comment: string | null;
  created_at: string;
  updated_at: string;
  cycle_name?: string;
  cycle_start_date?: string;
  cycle_end_date?: string;
  cycle_status?: string;
  category?: string | null;
  priority?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  success_measurement?: string | null;
  linked_objective?: string | null;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
  employee_designation?: string | null;
  employee_department?: string | null;
  employee_number?: string | null;
}

export interface TeamSubordinate {
  id: string;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  reportingManagerId?: string | null;
}

export async function getTeamSubordinates(): Promise<TeamSubordinate[]> {
  const response = await apiClient.get('/api/performance/team/subordinates');
  return response.data?.data ?? response.data ?? [];
}

export interface Colleague {
  id: string;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
}

export async function getColleagues(): Promise<Colleague[]> {
  const response = await apiClient.get('/api/performance/colleagues');
  return response.data?.data ?? response.data ?? [];
}

export interface CreatePerformanceGoalRequest {
  performance_cycle_id: string;
  title: string;
  description?: string | null;
  target: string;
  progress?: number;
  category?: string | null;
  priority?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  success_measurement?: string | null;
  linked_objective?: string | null;
  employee_comment?: string | null;
}

export interface UpdatePerformanceGoalRequest {
  title?: string;
  description?: string | null;
  target?: string;
  progress?: number;
  category?: string | null;
  priority?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  success_measurement?: string | null;
  linked_objective?: string | null;
  employee_comment?: string | null;
  manager_comment?: string | null;
}

export async function getMyPerformanceGoals(
  cycleId?: string
): Promise<PerformanceGoal[]> {
  const query = cycleId
    ? `?cycleId=${encodeURIComponent(cycleId)}`
    : '';

  const response =
    await apiClient.get(
      `/api/performance/goals/my${query}`
    );

  return response.data.data;
}

export async function getMyPerformanceGoal(
  id: string
): Promise<PerformanceGoal> {
  const response =
    await apiClient.get(
      `/api/performance/goals/${id}`
    );

  return response.data.data;
}

export async function createPerformanceGoal(
  data: CreatePerformanceGoalRequest
): Promise<PerformanceGoal> {
  const response =
    await apiClient.post(
      '/api/performance/goals',
      data
    );

  return response.data.data;
}

export async function updatePerformanceGoal(
  id: string,
  data: UpdatePerformanceGoalRequest
): Promise<PerformanceGoal> {
  const response =
    await apiClient.put(
      `/api/performance/goals/${id}`,
      data
    );

  return response.data.data;
}

export async function completePerformanceGoal(
  id: string
): Promise<PerformanceGoal> {
  const response =
    await apiClient.post(
      `/api/performance/goals/${id}/complete`
    );

  return response.data.data;
}

export async function cancelPerformanceGoal(
  id: string
): Promise<PerformanceGoal> {
  const response =
    await apiClient.post(
      `/api/performance/goals/${id}/cancel`
    );

  return response.data.data;
}

// Add getPerformanceCycles as a named export to support the exact React code 
export async function getPerformanceCycles() {
  return performanceApi.getPerformanceCycles();
}

// === PHASE 4 TYPES ===
export type PerformanceReviewStatus =
  | 'DRAFT'
  | 'SELF_ASSESSMENT_SUBMITTED'
  | 'MANAGER_REVIEW_IN_PROGRESS'
  | 'COMPLETED';

export interface PerformanceReview {
  id: string;
  performance_cycle_id: string;
  employee_id: string;
  reviewer_id: string | null;
  self_assessment: string | null;
  manager_review: string | null;
  manager_score: number | null;
  status: PerformanceReviewStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  cycle_name?: string;
  cycle_start_date?: string;
  cycle_end_date?: string;
  cycle_status?: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
}

export interface SaveSelfAssessmentRequest {
  self_assessment: string;
}

export interface SaveManagerReviewRequest {
  manager_review: string;
  manager_score: number;
}

// === PHASE 4 REVIEWS ===
export async function getMyPerformanceReview(cycleId: string): Promise<PerformanceReview | null> {
  const response = await apiClient.get(`/api/performance/reviews/my?cycleId=${encodeURIComponent(cycleId)}`);
  return response.data.data;
}

export async function getOrCreateMyPerformanceReview(cycleId: string): Promise<PerformanceReview> {
  const response = await apiClient.post(`/api/performance/reviews/my?cycleId=${encodeURIComponent(cycleId)}`);
  return response.data.data;
}

export async function saveMySelfAssessment(cycleId: string, data: SaveSelfAssessmentRequest): Promise<PerformanceReview> {
  const response = await apiClient.put(`/api/performance/reviews/my/${cycleId}/self-assessment`, data);
  return response.data.data;
}

export async function submitMySelfAssessment(cycleId: string): Promise<PerformanceReview> {
  const response = await apiClient.post(`/api/performance/reviews/my/${cycleId}/self-assessment/submit`);
  return response.data.data;
}

export async function getMyTeamPerformanceReviews(cycleId?: string): Promise<PerformanceReview[]> {
  const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
  const response = await apiClient.get(`/api/performance/reviews/team${query}`);
  return response.data.data;
}

export async function getMyTeamPerformanceReview(id: string): Promise<PerformanceReview> {
  const response = await apiClient.get(`/api/performance/reviews/team/${id}`);
  return response.data.data;
}

export async function saveManagerPerformanceReview(id: string, data: SaveManagerReviewRequest): Promise<PerformanceReview> {
  const response = await apiClient.put(`/api/performance/reviews/team/${id}`, data);
  return response.data.data;
}

export async function completeManagerPerformanceReview(id: string): Promise<PerformanceReview> {
  const response = await apiClient.post(`/api/performance/reviews/team/${id}/complete`);
  return response.data.data;
}



// === PHASE 6 REVIEWS ===
export async function getMyPerformanceReviews() {
  return apiClient.get('/api/performance/reviews/my');
}

export async function getOrCreateMyPerformanceReviewPhase6(cycleId: string) {
  return apiClient.get(`/api/performance/reviews/my/${cycleId}`);
}

export async function getMyPerformanceReviewPhase6(reviewId: string) {
  return apiClient.get(`/api/performance/reviews/${reviewId}`);
}

export async function savePerformanceReviewAnswers(reviewId: string, answers: Array<{ questionId: string; answer: unknown; }>) {
  return apiClient.put(`/api/performance/reviews/${reviewId}/answers`, { answers });
}

export async function sharePerformanceReview(reviewId: string) {
  return apiClient.post(`/api/performance/reviews/${reviewId}/share`);
}

export async function unsharePerformanceReview(reviewId: string) {
  return apiClient.post(`/api/performance/reviews/${reviewId}/unshare`);
}

export async function getTeamSelfAssessment(reviewId: string) {
  return apiClient.get(`/api/performance/reviews/team/${reviewId}/self-assessment`);
}



// === PHASE 7 MANAGER ASSESSMENT ===
export async function getTeamManagerAssessments() {
  return apiClient.get('/api/performance/team/manager-assessments');
}

export async function getManagerAssessment(reviewId: string) {
  return apiClient.get(`/api/performance/reviews/${reviewId}/manager-assessment`);
}

export async function saveManagerAssessment(
  reviewId: string,
  payload: { answers: Array<{ questionId: string; value: string | number | boolean | null }>; managerScore?: number | null }
) {
  return apiClient.put(`/api/performance/reviews/${reviewId}/manager-assessment`, payload);
}

export async function shareManagerAssessment(reviewId: string) {
  return apiClient.post(`/api/performance/reviews/${reviewId}/manager-assessment/share`);
}



// === PHASE 8 360-DEGREE FEEDBACK ===
export async function get360Requests(reviewId: string) {
  const response = await apiClient.get(`/api/performance/reviews/${reviewId}/360`);
  return response.data;
}

export async function create360Requests(reviewId: string, payload: { reviewers: Array<{ reviewerEmployeeId: string; relationship: string; }> }) {
  const response = await apiClient.post(`/api/performance/reviews/${reviewId}/360`, payload);
  return response.data;
}

export async function getEmployee360Summary(reviewId: string) {
  const response = await apiClient.get(`/api/performance/reviews/${reviewId}/360/employee-summary`);
  return response.data;
}

export async function get360Request(requestId: string) {
  const response = await apiClient.get(`/api/performance/360/requests/${requestId}`);
  return response.data;
}

export async function submit360Feedback(requestId: string, payload: { answers: Array<{ questionId: string; value: string | number | boolean | null; }> }) {
  const response = await apiClient.post(`/api/performance/360/requests/${requestId}/submit`, payload);
  return response.data;
}

export async function decline360Request(requestId: string) {
  const response = await apiClient.post(`/api/performance/360/requests/${requestId}/decline`);
  return response.data;
}



// === PHASE 9 REVIEW CLOSING TYPES ===
export interface ReviewClosingAssessmentValidation {
  exists: boolean;
  shared: boolean;
  requiredQuestionsComplete: boolean;
}

export interface ReviewClosingScoreValidation {
  present: boolean;
  value: number | null;
  valid: boolean;
}

export interface ReviewClosing360Validation {
  configured: boolean;
  totalRequests: number;
  submittedRequests: number;
  pendingRequests: number;
  declinedRequests: number;
  expiredRequests: number;
  summaryAvailable: boolean;
  requiredForClosure: boolean;
  validForClosure: boolean;
}

export interface ReviewClosingValidation {
  reviewId: string;
  employeeId: string;
  status: string;
  employeeAssessment: ReviewClosingAssessmentValidation;
  managerAssessment: ReviewClosingAssessmentValidation;
  employeeScore: ReviewClosingScoreValidation;
  managerScore: ReviewClosingScoreValidation;
  feedback360: ReviewClosing360Validation;
  canMarkReadyToClose: boolean;
  canClose: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export interface ReviewHistoryEntry {
  id: string;
  reviewId: string;
  employeeId: string;
  cycleId: string | null;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  employeeScore: number | null;
  managerScore: number | null;
  changedBy: string | null;
  eventDate: string;
  metadata: unknown;
}

// === PHASE 9 REVIEW CLOSING API ===
export async function getReviewClosingValidation(reviewId: string): Promise<ReviewClosingValidation> {
  const response = await apiClient.get(`/api/performance/reviews/${reviewId}/closing-validation`);
  return response.data?.data ?? response.data;
}

export async function markReviewReadyToClose(reviewId: string) {
  const response = await apiClient.post(`/api/performance/reviews/${reviewId}/ready-to-close`);
  return response.data;
}

export async function closeReview(reviewId: string) {
  const response = await apiClient.post(`/api/performance/reviews/${reviewId}/close`);
  return response.data;
}

export async function getReviewHistory(reviewId: string): Promise<ReviewHistoryEntry[]> {
  const response = await apiClient.get(`/api/performance/reviews/${reviewId}/history`);
  return response.data?.data ?? response.data ?? [];
}


// === PHASE 5 TYPES ===

export interface PerformanceCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
}

export interface PerformanceFeedback {
  id: string;
  performance_cycle_id: string | null;
  employee_id: string;
  from_employee_id: string | null;
  feedback: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  cycle_name?: string;
  cycle_status?: string;
  employee_name?: string;
  employee_number?: string;
  employee_designation?: string;
  sender_name?: string;
  sender_employee_number?: string;
  sender_designation?: string;
}

export type DevelopmentPlanStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface PerformanceDevelopmentPlan {
  id: string;
  performance_cycle_id: string;
  employee_id: string;
  development_area: string;
  action_plan: string;
  target_date: string | null;
  status: DevelopmentPlanStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  cycle_name?: string;
  cycle_status?: string;
  employee_name?: string;
  employee_number?: string;
  employee_designation?: string;
}


// === PHASE 5 GOAL CHECK-INS ===
export interface PerformanceGoalCheckin {
  id: string;
  goal_id: string;
  progress: number | null;
  comment: string | null;
  blockers: string | null;
  created_at: string;
  created_by: string;
}

export interface CreateGoalCheckinRequest {
  progress?: number;
  comment?: string;
  blockers?: string;
}

export async function getGoalCheckIns(goalId: string): Promise<PerformanceGoalCheckin[]> {
  const response = await apiClient.get(`/api/performance/goals/${goalId}/check-ins`);
  return response.data.data;
}

export async function createGoalCheckIn(goalId: string, data: CreateGoalCheckinRequest): Promise<{ id: string }> {
  const response = await apiClient.post(`/api/performance/goals/${goalId}/check-ins`, data);
  return response.data.data;
}

// === PHASE 5 TEAM GOALS ===
export async function getTeamGoals(cycleId?: string): Promise<PerformanceGoal[]> {
  const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
  const response = await apiClient.get(`/api/performance/goals/team${query}`);
  return response.data.data;
}

export async function getTeamGoalById(id: string): Promise<PerformanceGoal> {
  const response = await apiClient.get(`/api/performance/goals/team/${id}`);
  return response.data.data;
}

export async function createTeamGoal(employeeId: string, data: CreatePerformanceGoalRequest): Promise<PerformanceGoal> {
  const response = await apiClient.post(`/api/performance/goals/team/${employeeId}`, data);
  return response.data.data;
}

export async function updateTeamGoal(id: string, data: UpdatePerformanceGoalRequest): Promise<PerformanceGoal> {
  const response = await apiClient.put(`/api/performance/goals/team/${id}`, data);
  return response.data.data;
}


// === PHASE 5 API CLIENT ===

export async function getMyFeedback(cycleId?: string): Promise<PerformanceFeedback[]> {
  const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
  const response = await apiClient.get(`/api/performance/feedback/my${query}`);
  return response.data.data;
}

export async function getMyFeedbackById(id: string): Promise<PerformanceFeedback> {
  const response = await apiClient.get(`/api/performance/feedback/my/${id}`);
  return response.data.data;
}

export async function createFeedback(payload: { employee_id: string; performance_cycle_id: string; feedback: string }): Promise<PerformanceFeedback> {
  const response = await apiClient.post(`/api/performance/feedback`, payload);
  return response.data.data;
}

export async function getTeamFeedback(): Promise<PerformanceFeedback[]> {
  const response = await apiClient.get(`/api/performance/feedback/team`);
  return response.data.data;
}

export async function getTeamFeedbackForEmployee(employeeId: string): Promise<PerformanceFeedback[]> {
  const response = await apiClient.get(`/api/performance/feedback/team/${employeeId}`);
  return response.data.data;
}

export async function getMyDevelopmentPlans(): Promise<PerformanceDevelopmentPlan[]> {
  const response = await apiClient.get(`/api/performance/development-plans/my`);
  return response.data.data;
}

export async function getMyDevelopmentPlan(id: string): Promise<PerformanceDevelopmentPlan> {
  const response = await apiClient.get(`/api/performance/development-plans/my/${id}`);
  return response.data.data;
}

export async function createDevelopmentPlan(payload: { performance_cycle_id: string; development_area: string; action_plan: string; target_date?: string }): Promise<PerformanceDevelopmentPlan> {
  const response = await apiClient.post(`/api/performance/development-plans`, payload);
  return response.data.data;
}

export async function updateDevelopmentPlan(id: string, payload: Partial<PerformanceDevelopmentPlan>): Promise<PerformanceDevelopmentPlan> {
  const response = await apiClient.put(`/api/performance/development-plans/${id}`, payload);
  return response.data.data;
}

export async function completeDevelopmentPlan(id: string): Promise<PerformanceDevelopmentPlan> {
  const response = await apiClient.post(`/api/performance/development-plans/${id}/complete`);
  return response.data.data;
}

export async function cancelDevelopmentPlan(id: string): Promise<PerformanceDevelopmentPlan> {
  const response = await apiClient.post(`/api/performance/development-plans/${id}/cancel`);
  return response.data.data;
}

export async function getTeamDevelopmentPlans(): Promise<PerformanceDevelopmentPlan[]> {
  const response = await apiClient.get(`/api/performance/development-plans/team`);
  return response.data.data;
}

export async function getTeamDevelopmentPlansForEmployee(employeeId: string): Promise<PerformanceDevelopmentPlan[]> {
  const response = await apiClient.get(`/api/performance/development-plans/team/${employeeId}`);
  return response.data.data;
}

export async function updateTeamDevelopmentPlan(id: string, payload: Partial<PerformanceDevelopmentPlan>): Promise<PerformanceDevelopmentPlan> {
  const response = await apiClient.put(`/api/performance/development-plans/team/${id}`, payload);
  return response.data.data;
}

// === PHASE 10 REPORTING ===
export interface PerformanceReportFilters {
  cycleId?: string;
  department?: string;
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PerformanceDashboardSummary {
  cycles: number;
  activeCycles: number;
  completedCycles: number;
  eligibleEmployees: number;
  reviews: number;
  completedReviews: number;
  completionRate: number;
  openGoals: number;
  overdueGoals: number;
  completedGoals: number;
  pending360: number;
  submitted360: number;
  activeDevelopmentPlans: number;
}

export interface PerformanceCycleDashboard {
  cycleId: string;
  cycleName: string;
  status: string;
  totalEligible: number;
  reviewsCreated: number;
  employeeShared: number;
  managerShared: number;
  readyToClose: number;
  closed: number;
  completionRate: number;
  openGoals: number;
  completedGoals: number;
  overdueGoals: number;
  pending360: number;
  submitted360: number;
}

export interface PerformanceCompletionReportRow {
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string;
  department: string | null;
  cycleId: string;
  cycleName: string;
  reviewStatus: string | null;
  employeeScore: number | null;
  managerScore: number | null;
  closedDate: string | null;
}

export interface PerformanceGoalReportRow {
  goalId: string;
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string;
  department: string | null;
  title: string;
  category: string | null;
  priority: string | null;
  status: string;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  cycleId: string | null;
  cycleName: string | null;
}

export interface PerformanceOverdueGoalRow extends PerformanceGoalReportRow {
  daysOverdue: number;
}

export interface PerformanceScoreReportRow {
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string;
  department: string | null;
  cycleId: string;
  cycleName: string;
  employeeScore: number | null;
  managerScore: number | null;
  status: string;
}

export interface PerformanceDepartmentTrendRow {
  department: string | null;
  cycleId: string;
  cycleName: string;
  employeeCount: number;
  employeeScoreAverage: number | null;
  managerScoreAverage: number | null;
  completedReviews: number;
  completionRate: number;
}

export interface Performance360ReportRow {
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  invited: number;
  submitted: number;
  declined: number;
  expired: number;
  completionRate: number;
}

export interface PerformanceOutstanding360Row {
  requestId: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  reviewerEmployeeId: string;
  reviewerName: string;
  status: string;
  invitedAt: string | null;
  dueDate: string | null;
}

export interface PerformanceDevelopmentReportRow {
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string;
  department: string | null;
  cycleId: string | null;
  cycleName: string | null;
  status: string;
  planCount: number;
  activeActions: number;
  completedActions: number;
}

export function buildPerformanceReportQuery(filters: PerformanceReportFilters = {}): string {
  const params = new URLSearchParams();

  const entries: Array<[keyof PerformanceReportFilters, string | number | undefined]> = [
    ['cycleId', filters.cycleId],
    ['department', filters.department],
    ['employeeId', filters.employeeId],
    ['status', filters.status],
    ['startDate', filters.startDate],
    ['endDate', filters.endDate],
    ['search', filters.search],
    ['page', filters.page],
    ['limit', filters.limit],
  ];

  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getPerformanceDashboard(): Promise<PerformanceDashboardSummary> {
  const response = await apiClient.get('/api/performance/dashboard');
  return response.data.data;
}

export async function getCycleDashboard(cycleId: string): Promise<PerformanceCycleDashboard> {
  const response = await apiClient.get(`/api/performance/cycles/${encodeURIComponent(cycleId)}/dashboard`);
  return response.data.data;
}

export async function getPerformanceCompletionReport(filters: PerformanceReportFilters = {}): Promise<PerformanceCompletionReportRow[]> {
  const response = await apiClient.get(`/api/performance/reports/completion${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformanceGoalReport(filters: PerformanceReportFilters = {}): Promise<PerformanceGoalReportRow[]> {
  const response = await apiClient.get(`/api/performance/reports/goals${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformanceOverdueGoalReport(filters: PerformanceReportFilters = {}): Promise<PerformanceOverdueGoalRow[]> {
  const response = await apiClient.get(`/api/performance/reports/overdue-goals${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformanceScoreReport(filters: PerformanceReportFilters = {}): Promise<PerformanceScoreReportRow[]> {
  const response = await apiClient.get(`/api/performance/reports/scores${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformanceDepartmentTrendReport(filters: PerformanceReportFilters = {}): Promise<PerformanceDepartmentTrendRow[]> {
  const response = await apiClient.get(`/api/performance/reports/department-trends${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformance360Report(filters: PerformanceReportFilters = {}): Promise<Performance360ReportRow[]> {
  const response = await apiClient.get(`/api/performance/reports/360${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformanceOutstanding360Report(filters: PerformanceReportFilters = {}): Promise<PerformanceOutstanding360Row[]> {
  const response = await apiClient.get(`/api/performance/reports/360/outstanding${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getPerformanceDevelopmentReport(filters: PerformanceReportFilters = {}): Promise<PerformanceDevelopmentReportRow[]> {
  const response = await apiClient.get(`/api/performance/reports/development${buildPerformanceReportQuery(filters)}`);
  return response.data.data;
}

export async function getMyReviews() {
  return apiClient.get('/api/performance/reviews/my');
}
