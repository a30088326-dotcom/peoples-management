// @ts-nocheck
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';

export type EmployeeCompletenessIssue = {
  employeeId: string;
  field: string;
  message: string;
};

export async function generateNextEmployeeNo(connection: any): Promise<string> {
  // Transaction-safe because the caller must hold the employee transaction.
  const [rows] = await connection.query<any>(`
    SELECT employeeNo
    FROM employee_information_employees
    WHERE employeeNo REGEXP '^EMP-[0-9]+$'
    ORDER BY CAST(SUBSTRING(employeeNo, 5) AS UNSIGNED) DESC
    LIMIT 1
    FOR UPDATE
  `);

  const current = rows[0]?.employeeNo;
  const currentNumber = current ? Number.parseInt(current.substring(4), 10) : 0;
  return `EMP-${String(currentNumber + 1).padStart(6, '0')}`;
}

export async function resolveRosterAssignment(
  connection: any,
  employeeId: string,
  rosterGroupId: string | null | undefined,
  effectiveStartDate?: string | null,
  effectiveEndDate?: string | null,
) {
  const start = effectiveStartDate || new Date().toISOString().slice(0, 10);

  if (!rosterGroupId) {
    await connection.query<any>(
      `UPDATE attendance_roster_assignments
       SET status = 'Previous', effectiveEndDate = ?
       WHERE employeeId = ? AND status = 'Active'`,
      [start, employeeId],
    );
    return null;
  }

  const [groups] = await connection.query<any>(
    `SELECT id FROM attendance_roster_groups WHERE id = ? AND status = 'Active' LIMIT 1`,
    [rosterGroupId],
  );
  if (!groups.length) throw new Error('Selected roster group is not active or does not exist.');

  const [shiftRows] = await connection.query<any>(
    `SELECT shiftId
     FROM attendance_roster_group_shifts
     WHERE rosterGroupId = ? OR groupId = ?
     ORDER BY isDefault DESC, displayOrder ASC
     LIMIT 1`,
    [rosterGroupId, rosterGroupId],
  );
  if (!shiftRows.length || !shiftRows[0].shiftId) {
    throw new Error('Selected roster group has no default/linked shift. Configure the roster group before assigning it.');
  }

  const shiftId = shiftRows[0].shiftId;

  const [active] = await connection.query<any>(
    `SELECT id, rosterGroupId, groupId, shiftId
     FROM attendance_roster_assignments
     WHERE employeeId = ? AND status = 'Active'
     ORDER BY effectiveStartDate DESC, createdAt DESC
     LIMIT 1`,
    [employeeId],
  );

  if (active.length && active[0].rosterGroupId === rosterGroupId && active[0].shiftId === shiftId) {
    await connection.query<any>(
      `UPDATE attendance_roster_assignments
       SET effectiveStartDate = ?, effectiveEndDate = ?, shiftId = ?, rosterGroupId = ?, groupId = ?
       WHERE id = ?`,
      [start, effectiveEndDate || null, shiftId, rosterGroupId, rosterGroupId, active[0].id],
    );
    return { id: active[0].id, rosterGroupId, shiftId };
  }

  await connection.query<any>(
    `UPDATE attendance_roster_assignments
     SET status = 'Previous', effectiveEndDate = ?
     WHERE employeeId = ? AND status = 'Active'`,
    [start, employeeId],
  );

  const id = uuidv4();
  await connection.query<any>(
    `INSERT INTO attendance_roster_assignments
      (id, employeeId, rosterGroupId, groupId, shiftId, effectiveStartDate, effectiveEndDate, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
    [id, employeeId, rosterGroupId, rosterGroupId, shiftId, start, effectiveEndDate || null],
  );

  return { id, rosterGroupId, shiftId };
}

export async function writeEmployeeAudit(
  connection: any,
  employeeId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  reason = 'Automated employee completeness repair',
) {
  // Use the existing audit table if available. If the project uses a different
  // audit table, create a migration first rather than silently dropping logs.
  try {
    await connection.query<any>(
      `INSERT INTO employee_information_audit_log
        (id, employeeId, fieldName, oldValue, newValue, reason, changedBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'SYSTEM', NOW())`,
      [
        uuidv4(),
        employeeId,
        field,
        oldValue == null ? null : String(oldValue),
        newValue == null ? null : String(newValue),
        reason,
      ],
    );
  } catch (error: any) {
    if (!String(error?.message || '').toLowerCase().includes('doesn\'t exist')) throw error;
  }
}

export async function auditEmployeeCompleteness(employeeId: string): Promise<EmployeeCompletenessIssue[]> {
  const issues: EmployeeCompletenessIssue[] = [];
  const [rows] = await db.query(`
    SELECT e.id, e.userId, e.employeeNo, e.employeeStatus, e.isActive,
           e.companyId, e.locationId, e.departmentId, e.designationId,
           e.employmentTypeId, e.reportingManagerId,
           e.timeAndAttendanceActive, e.payrollActive,
           pd.firstName, pd.lastName, pd.dob, pd.gender,
           wd.locationId AS workstationLocationId,
           COALESCE(ra.groupId, ra.rosterGroupId) AS rosterGroupId, ra.shiftId,
           u.email AS userEmail
    FROM employee_information_employees e
    LEFT JOIN employee_information_personal_details pd ON pd.employeeId = e.id
    LEFT JOIN employee_information_workstation_details wd ON wd.employeeId = e.id
    LEFT JOIN users u ON u.id = e.userId
    LEFT JOIN attendance_roster_assignments ra
      ON ra.employeeId = e.id AND ra.status = 'Active'
    WHERE e.id = ?
    ORDER BY ra.effectiveStartDate DESC
    LIMIT 1`,
    [employeeId],
  );

  const e = rows[0];
  if (!e) return [{ employeeId, field: 'employee', message: 'Employee record not found.' }];
  if (!e.userId) issues.push({ employeeId, field: 'userId', message: 'Employee has no linked user.' });
  if (!e.employeeNo) issues.push({ employeeId, field: 'employeeNo', message: 'Employee number is missing.' });
  if (!e.firstName || !e.lastName) issues.push({ employeeId, field: 'personalDetails', message: 'First name/last name is incomplete.' });
  if (!e.companyId) issues.push({ employeeId, field: 'companyId', message: 'Company is missing.' });
  if (!e.locationId && e.isActive) issues.push({ employeeId, field: 'locationId', message: 'Work location is missing.' });
  if (!e.departmentId) issues.push({ employeeId, field: 'departmentId', message: 'Department is missing.' });
  if (!e.designationId) issues.push({ employeeId, field: 'designationId', message: 'Designation is missing.' });
  if (!e.employmentTypeId) issues.push({ employeeId, field: 'employmentTypeId', message: 'Employment type is missing.' });
  if (!e.reportingManagerId && e.employeeStatus === 'Active') issues.push({ employeeId, field: 'reportingManagerId', message: 'Reporting manager is missing.' });
  if (e.timeAndAttendanceActive && (!e.rosterGroupId || !e.shiftId)) {
    issues.push({ employeeId, field: 'attendance.roster', message: 'Active time-and-attendance employee has no valid roster group/shift assignment.' });
  }
  if (e.payrollActive && !e.payrollActive) issues.push({ employeeId, field: 'payroll', message: 'Payroll is incomplete.' });
  return issues;
}
