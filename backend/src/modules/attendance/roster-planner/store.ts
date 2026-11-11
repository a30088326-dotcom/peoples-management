import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { db } from '../../../lib/db';
import { repository, type RepositorySession } from '../../../storage/repository';
import type { EntityName } from '../../../storage/table-definitions';
import { RosterError } from '../roster-validation';
import type { Plan, RosterRow } from './pattern';

type Row = Record<string, any>;
type Reader = { list: (table: EntityName, filter?: (row: Row) => boolean) => Promise<Row[]> };
type Writer = Reader & {
  getRoster: (id: string) => Promise<RosterRow | undefined>;
  lockEmployees: (ids: string[]) => Promise<void>;
  lockShifts: (ids: string[]) => Promise<Row[]>;
  saveRoster: (row: RosterRow, plan: Plan, status: 'Draft' | 'Active') => Promise<void>;
  addAssignment: (id: string, employeeId: string, plan: Plan) => Promise<void>;
};

const useNative = () => process.env.DATABASE_PROVIDER === 'dynamodb';
const nativeReader: Reader = { list: (table, filter = () => true) => repository().find(table, filter) };
function sqlReader(connection: Pick<PoolConnection, 'query'>): Reader {
  return { list: async (table, filter = () => true) => {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM ??', [table]);
    return rows.filter(filter);
  } };
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
  };
}

function sqlWriter(connection: PoolConnection): Writer {
  return {
    ...sqlReader(connection),
    getRoster: async id => (await connection.query<RowDataPacket[]>('SELECT * FROM attendance_roster_groups WHERE id=? FOR UPDATE', [id]))[0][0] as RosterRow | undefined,
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
