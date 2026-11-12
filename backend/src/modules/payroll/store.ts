import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { db } from '../../lib/db';
import { repository, type RepositorySession } from '../../storage/repository';
import type { Reader, Row } from '../attendance/roster-planner/store';

export class PayrollError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export type RecordType = 'profile' | 'rules' | 'input' | 'run' | 'guard';
export type RecordRow = { id: string; kind: RecordType; period: string; employeeId?: string; payload: unknown; _version: number };
type RecordInput = Omit<RecordRow, '_version'>;
export type PayrollStore = Reader & {
  get: (id: string) => Promise<RecordRow | undefined>;
  records: (kind: RecordType) => Promise<RecordRow[]>;
  punches: (employees: Set<string>, from: string, until: string) => Promise<Row[]>;
  put: (row: RecordInput, expected?: RecordRow) => Promise<RecordRow>;
};
function native(read: RepositorySession, write = read): PayrollStore {
  return {
    list: (entity, filter = () => true) => read.find(entity, filter),
    punches: (employees, from, until) => read.find('attendance_raw_logs', row => {
      const date = String(row.timestamp ?? '').slice(0, 10);
      return employees.has(row.employeeId) && date >= from && date < until;
    }),
    get: async id => await write.get('payroll_records', { id }) as RecordRow | undefined,
    records: async kind => await read.find('payroll_records', row => row.kind === kind) as RecordRow[],
    put: async (row, expected) => expected
      ? await write.replace('payroll_records', { ...expected, ...row }) as RecordRow
      : await write.create('payroll_records', row) as RecordRow,
  };
}
function unpack(row?: RowDataPacket): RecordRow | undefined {
  return row && { ...row, _version: row.version, payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload } as RecordRow;
}
function sql(connection: Pool | PoolConnection, transaction = false): PayrollStore {
  return {
    list: async (entity, filter = () => true) =>
      (await connection.query<RowDataPacket[]>({ sql: 'SELECT * FROM ??', dateStrings: true }, [entity]))[0].filter(filter),
    punches: async (employees, from, until) => (await connection.query<RowDataPacket[]>({
      sql: 'SELECT id, employeeId, timestamp, logType, direction FROM attendance_raw_logs WHERE employeeId IN (?) AND timestamp >= ? AND timestamp < ?',
      dateStrings: true,
    }, [[...employees], from, until]))[0],
    get: async id => unpack((await connection.query<RowDataPacket[]>(`SELECT * FROM payroll_records WHERE id=?${transaction ? ' FOR UPDATE' : ''}`, [id]))[0][0]),
    records: async kind => (await connection.query<RowDataPacket[]>('SELECT * FROM payroll_records WHERE kind=?', [kind]))[0].map(row => unpack(row)!),
    put: async (row, expected) => {
      const values = { id: row.id, kind: row.kind, period: row.period, employeeId: row.employeeId ?? null,
        payload: JSON.stringify(row.payload), version: (expected?._version ?? 0) + 1 };
      if (expected) await connection.query('UPDATE payroll_records SET ? WHERE id=?', [values, row.id]);
      else await connection.query('INSERT INTO payroll_records SET ?', values);
      return { ...row, _version: values.version };
    },
  };
}
const dynamo = () => process.env.DATABASE_PROVIDER === 'dynamodb';
export const payrollReader = () => dynamo() ? native(repository()) : sql(db);

export async function payrollWrite<T>(work: (store: PayrollStore) => Promise<T>) {
  const guarded = async (store: PayrollStore) => {
    // One aggregate serializes changes to payroll inputs, policy, and approval across periods.
    const guard = await store.get('payroll-write');
    await store.put({ id: 'payroll-write', kind: 'guard', period: '', payload: {} }, guard);
    return work(store);
  };
  if (dynamo()) {
    const repo = repository();
    return repo.transaction(tx => guarded(native(repo, tx)));
  }
  const connection = await db.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await guarded(sql(connection, true));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
