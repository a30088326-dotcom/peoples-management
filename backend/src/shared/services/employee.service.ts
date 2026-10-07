// @ts-nocheck
import { db } from '../../lib/db';
import { RowDataPacket } from 'mysql2';

export class SharedEmployeeService {
  /**
   * Resolves a userId (from JWT) to an employeeId
   */
  static async getEmployeeIdByUserId(userId: string): Promise<string | null> {
    const [rows] = await db.query(
      'SELECT id FROM employee_information_employees WHERE userId = ? LIMIT 1',
      [userId]
    );
    if (rows.length > 0) return rows[0].id;
    return null;
  }

  /**
   * Fetches the complete, canonical employee record joined with EIM master data
   */
  static async getEmployeeDetails(employeeId: string): Promise<any | null> {
    const query = `
      SELECT 
        e.id, e.userId, e.employeeNumber, e.firstName, e.lastName, e.email,
        e.status, e.isActive, e.dateJoined,
        pd.gender,
        e.departmentId, d.name AS departmentName,
        e.designationId, des.name AS designationName,
        e.locationId, l.name AS locationName,
        e.reportingManagerId,
        CONCAT(m.firstName, ' ', m.lastName) AS reportingManagerName
      FROM employee_information_employees e
      LEFT JOIN employee_information_personal_details pd ON e.id = pd.employeeId
      LEFT JOIN eim_structures d ON e.departmentId = d.id AND d.structureType = 'Department'
      LEFT JOIN designations des ON e.designationId = des.id
      LEFT JOIN eim_locations l ON e.locationId = l.id
      LEFT JOIN employee_information_employees m ON e.reportingManagerId = m.id
      WHERE e.id = ?
    `;

    const [rows] = await db.query(query, [employeeId]);
    if (rows.length === 0) return null;
    return rows[0];
  }

  /**
   * Validates if an employee exists and is active
   */
  static async validateEmployeeIsActive(employeeId: string): Promise<boolean> {
    const [rows] = await db.query(
      'SELECT isActive FROM employee_information_employees WHERE id = ? LIMIT 1',
      [employeeId]
    );
    return rows.length > 0 && !!rows[0].isActive;
  }
}
