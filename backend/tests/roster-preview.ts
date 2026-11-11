import { randomBytes } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRoutes from '../src/modules/auth/auth.routes';
import attendanceRoutes from '../src/modules/attendance/native.routes';
import organizationRoutes from '../src/shared/organization.routes';
import { addDays, OFF } from '../src/modules/attendance/roster-planner/pattern';
import { changePublishedShift, publishRoster, saveDraft } from '../src/modules/attendance/roster-planner/service';
import { attendanceDate } from '../src/modules/attendance/calculation.service';
import { withRepositoryForTests } from '../src/storage/repository';
import { adminId, dayId, employeeId, eveningId, nightId, rosterFixture, serverId } from './roster-fixture';

async function start() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PROVIDER = 'dynamodb';
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const password = process.env.ROSTER_PREVIEW_PASSWORD;
  if (!password) throw new Error('Set ROSTER_PREVIEW_PASSWORD for the local preview account.');
  const repo = await rosterFixture(await bcrypt.hash(password, 10));
  await withRepositoryForTests(repo, async () => {
    const today = attendanceDate(new Date());
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const startDate = addDays(today, -((weekday + 6) % 7));
    const saved = await saveDraft(adminId, { name: 'Restaurant Service Roster', repeat: 'biweekly',
      startDate, endDate: addDays(startDate, 27), employees: [
        { employeeId, shifts: [dayId, dayId, OFF, nightId, OFF, dayId, dayId, eveningId, OFF, dayId, dayId, OFF, dayId, OFF] },
        { employeeId: serverId, shifts: [eveningId, eveningId, eveningId, OFF, eveningId, eveningId, OFF, dayId, dayId, OFF, eveningId, eveningId, OFF, eveningId] },
      ] });
    const published = await publishRoster(adminId, saved.id, saved.version);
    await changePublishedShift(adminId, saved.id, { employeeId, version: published.version,
      scope: 'occurrence', date: addDays(startDate, 1), shiftId: eveningId });
  });
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    void withRepositoryForTests(repo, async () => next());
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'isolated-roster-preview' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/organization', organizationRoutes);
  app.listen(3199, '127.0.0.1', () => console.log('Roster preview API listening on port 3199.'));
}

void start().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
