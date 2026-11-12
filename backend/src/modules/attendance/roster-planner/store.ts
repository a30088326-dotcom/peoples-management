import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { db } from '../../../lib/db';
import { repository, type RepositorySession } from '../../../storage/repository';
import type { EntityName } from '../../../storage/table-definitions';
import { RosterError } from '../roster-validation';
import { datesBetween, type Plan, type RosterRow } from './pattern';

type Row = Record<string, any>;
type PayrollLock = { employeeId: string; period: string };
type Reader = {
  list: (table: EntityName, filter?: (row: Row) => boolean) => Promise<Row[]>;
  payrollLocks?: (employeeIds: string[], from: string, to: string) => Promise<PayrollLock[]>;
};
type Writer = Reader & {
  getRoster: (id: string) => Promise<RosterRow | undefined>;
  lockPayroll: () => Promise<void>;
  lockEmployees: (ids: string[]) => Promise<void>;
  lockShifts: (ids: string[]) => Promise<Row[]>;
  saveRoster: (row: RosterRow, plan: Plan, status: 'Draft' | 'Active') => Promise<void>;
  addAssignment: (id: string, employeeId: string, plan: Plan) => Promise<void>;
  deleteDraft: (row: RosterRow) => Promise<void>;
};

const useNative = () => process.env.DATABASE_PROVIDER === 'dynamodb';
const payrollGuard = { id: 'payroll-write', kind: 'guard', period: '', payload: {} };

function approvedLocks(records: (Row | undefined)[], employeeIds: string[]): PayrollLock[] {
  const employees = new Set(employeeIds);
  return records.flatMap(record => {
    if (!record || record.kind !== 'run') return [];
    const snapshot = typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload;
    if (snapshot?.status !== 'approved' || !Array.isArray(snapshot.rows)) return [];
    return snapshot.rows.flatMap((line: { employeeId: string }) => employees.has(line.employeeId)
      ? [{ employeeId: line.employeeId, period: record.period }] : []);
  });
}

function missingPayrollTable(error: unknown) {
  return error instanceof Error && (error.name === 'ResourceNotFoundException' ||
    'code' in error && error.code === 'ER_NO_SUCH_TABLE');
}

const nativeReader: Reader = {
  list: (table, filter = () => true) => repository().find(table, filter),
  payrollLocks: async (employeeIds, from, to) => {
    if (!employeeIds.length) return [];
    const months = new Set(datesBetween(from, to).map(date => date.slice(0, 7)));
    try {
      const records = await Promise.all([...months].map(month => repository().get('payroll_records', { id: `run:${month}` })));
      return approvedLocks(records, employeeIds);
    } catch (error) {
      if (missingPayrollTable(error)) return [];
      throw error;
    }
  },
};
function sqlReader(connection: Pick<PoolConnection, 'query'>): Reader {
  return {
    list: async (table, filter = () => true) => {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM ??', [table]);
      return rows.filter(filter);
    },
    payrollLocks: async (employeeIds, from, to) => {
      if (!employeeIds.length) return [];
      try {
        const [rows] = await connection.query<RowDataPacket[]>(
          "SELECT kind, period, payload FROM payroll_records WHERE id BETWEEN ? AND ? AND kind='run'",
          [`run:${from.slice(0, 7)}`, `run:${to.slice(0, 7)}`]);
        return approvedLocks(rows, employeeIds);
      } catch (error) {
        if (missingPayrollTable(error)) return [];
        throw error;
      }
    },
  };
}
export const rosterReader = () => useNative() ? nativeReader : sqlReader(db);

const rosterFields = (plan: Plan, status: 'Draft' | 'Active') => ({
  name: plan.name, effectiveStartDate: plan.startDate, effectiveEndDate: plan.endDate,
  rosterCycle: { none: 'Custom', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' }[plan.repeat], status,
});

function assertActive(employee?: Row) {
  if (!employee || employee.status !== 'Active' || Number(employee.isActive ?? 1) !== 1) {
    throw new RosterError(409, 'A selected employee is inactive or no longer exists. Refresh the roster.');
  }
}

function nativeWriter(tx: RepositorySession): Writer {
  return {
    ...nativeReader,
    getRoster: async id => await tx.get('attendance_roster_groups', { id }) as RosterRow | undefined,
    lockPayroll: async () => {
      // Payroll approvals update this same record, invalidating concurrent roster edits.
      try {
        const guard = await tx.get('payroll_records', { id: payrollGuard.id });
        if (guard) await tx.replace('payroll_records', guard);
        else await tx.create('payroll_records', payrollGuard);
      } catch (error) {
        if (!missingPayrollTable(error)) throw error;
      }
    },
    lockEmployees: async ids => {
      // Attendance punches and both roster writers version the same employee row.
      for (const id of [...ids].sort()) {
        const employee = await tx.get('employee_information_employees', { id });
        assertActive(employee);
        await tx.replace('employee_information_employees', { ...employee! });
      }
    },
    lockShifts: async ids => (await Promise.all(ids.map(id => tx.get('attendance_shifts', { id })))).filter((row): row is NonNullable<typeof row> => !!row),
    saveRoster: async (row, plan, status) => {
      const current = await tx.get('attendance_roster_groups', { id: row.id });
      const value = { ...rosterFields(plan, status), schedulePlan: plan };
      if (current) await tx.replace('attendance_roster_groups', { ...current, ...value });
      else await tx.create('attendance_roster_groups', { id: row.id, code: row.code, ...value });
    },
    addAssignment: async (id, employeeId, plan) => {
      await tx.create('attendance_roster_assignments', { id: randomUUID(), groupId: id, rosterGroupId: id, employeeId,
        effectiveStartDate: plan.startDate, effectiveEndDate: plan.endDate, effectiveFrom: plan.startDate,
        effectiveTo: plan.endDate, shiftId: null, status: 'Active' });
    },
    deleteDraft: async row => {
      const assignments = await tx.find('attendance_roster_assignments', assignment =>
        assignment.groupId === row.id || assignment.rosterGroupId === row.id);
      if (assignments.length) throw new RosterError(409, 'This roster has employee assignment history and cannot be deleted.');
      await tx.remove('attendance_roster_groups', { id: row.id }, row._version);
    },
  };
}

function sqlWriter(connection: PoolConnection): Writer {
  return {
    ...sqlReader(connection),
    getRoster: async id => (await connection.query<RowDataPacket[]>('SELECT * FROM attendance_roster_groups WHERE id=? FOR UPDATE', [id]))[0][0] as RosterRow | undefined,
    lockPayroll: async () => {
      try {
        await connection.query('INSERT INTO payroll_records (id, kind, period, payload) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
          [payrollGuard.id, payrollGuard.kind, payrollGuard.period, JSON.stringify(payrollGuard.payload)]);
      } catch (error) {
        if (!missingPayrollTable(error)) throw error;
      }
    },
    lockEmployees: async ids => {
      for (const id of [...ids].sort()) {
        const [[employee]] = await connection.query<RowDataPacket[]>('SELECT id,status,isActive FROM employee_information_employees WHERE id=? FOR UPDATE', [id]);
        assertActive(employee);
      }
    },
    lockShifts: async ids => ids.length
      ? (await connection.query<RowDataPacket[]>('SELECT * FROM attendance_shifts WHERE id IN (?) ORDER BY id FOR UPDATE', [ids]))[0] : [],
    saveRoster: async (row, plan, status) => {
      const value = { ...rosterFields(plan, status), schedulePlan: JSON.stringify(plan) };
      if (row.schedulePlan) await connection.query('UPDATE attendance_roster_groups SET ? WHERE id=?', [value, row.id]);
      else await connection.query('INSERT INTO attendance_roster_groups SET ?', { id: row.id, code: row.code, ...value });
    },
    addAssignment: async (id, employeeId, plan) => {
      await connection.query(`INSERT INTO attendance_roster_assignments
        (id,groupId,rosterGroupId,employeeId,effectiveStartDate,effectiveEndDate,effectiveFrom,effectiveTo,shiftId,status)
        VALUES (?,?,?,?,?,?,?,?,NULL,'Active')`, [randomUUID(), id, id, employeeId, plan.startDate, plan.endDate, plan.startDate, plan.endDate]);
    },
    deleteDraft: async row => {
      const [[assignment]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM attendance_roster_assignments WHERE groupId=? OR rosterGroupId=? LIMIT 1 FOR UPDATE', [row.id, row.id]);
      if (assignment) throw new RosterError(409, 'This roster has employee assignment history and cannot be deleted.');
      await connection.query('DELETE FROM attendance_roster_groups WHERE id=?', [row.id]);
    },
  };
}

export async function rosterTransaction<T>(work: (tx: Writer) => Promise<T>): Promise<T> {
  if (useNative()) return repository().transaction(tx => work(nativeWriter(tx)));
  const connection = await db.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await work(sqlWriter(connection));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export type { Reader, Row, Writer };
