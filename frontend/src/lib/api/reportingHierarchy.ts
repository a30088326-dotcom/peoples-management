import { api, ApiResponse } from './client';
import { HierarchyNode, HierarchyEmployee, AssignManagerPayload, HierarchyAuditRecord } from '../../types';

export const reportingHierarchyApi = {
  /**
   * Fetch active employees for dropdowns (manager assignment)
   */
  getActiveEmployees: (search?: string, excludeId?: string) => {
    return api.get<ApiResponse<HierarchyEmployee[]>>('/api/reporting-hierarchy/employees', {
      params: { search, excludeId }
    });
  },

  /**
   * Fetch the hierarchy tree. If parentId is undefined, returns top-level nodes.
   */
  getTreeNodes: (parentId?: string) => {
    return api.get<ApiResponse<HierarchyNode[]>>('/api/reporting-hierarchy/tree', {
      params: { parentId }
    });
  },

  /**
   * Assign or change a reporting manager
   */
  assignManager: (payload: AssignManagerPayload) => {
    return api.post<ApiResponse<null>>('/api/reporting-hierarchy/assign', payload);
  },

  /**
   * Get audit history of reporting hierarchy changes
   */
  getAuditHistory: () => {
    return api.get<ApiResponse<HierarchyAuditRecord[]>>('/api/reporting-hierarchy/audit');
  },

  /**
   * Get upward reporting path for an employee
   */
  getUpwardPath: (employeeId: string) => {
    return api.get<ApiResponse<string[]>>(`/api/reporting-hierarchy/upward-path/${employeeId}`);
  },

  /**
   * Get employeeId for the currently logged in user
   */
  getMyNode: () => {
    return api.get<ApiResponse<string>>('/api/reporting-hierarchy/my-node');
  },

  /**
   * Fetch employees with no reporting manager assigned (excluding CEO)
   */
  getUnassignedEmployees: () => {
    return api.get<ApiResponse<HierarchyEmployee[]>>('/api/reporting-hierarchy/unassigned');
  },

  /**
   * Bulk update reporting managers from drag-and-drop edits
   */
  bulkUpdateManagers: (changes: Array<{ employeeId: string; newReportingManagerId: string | null }>, effectiveDate: string) => {
    return api.post<ApiResponse<null>>('/api/reporting-hierarchy/bulk-update', { changes, effectiveDate });
  },

  /**
   * Get hierarchy level custom names
   */
  getLevels: () => {
    return api.get<ApiResponse<Record<number, string>>>('/api/reporting-hierarchy/levels');
  },

  /**
   * Update hierarchy level custom name
   */
  updateLevel: (depth: number, name: string) => {
    return api.put<ApiResponse<null>>(`/api/reporting-hierarchy/levels/${depth}`, { name });
  }
};
