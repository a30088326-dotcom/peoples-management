import { memory } from './dynamodb.domain-memory';

export const adminId = 'roster-preview-admin';
export const employeeId = 'roster-kitchen-employee';
export const serverId = 'roster-service-employee';
export const dayId = 'roster-day-shift';
export const eveningId = 'roster-evening-shift';
export const nightId = 'roster-night-shift';
export const earlyId = 'roster-early-shift';

export async function rosterFixture(password?: string) {
  const { repo } = memory();
  await repo.create('users', { id: adminId, email: 'roster.preview@example.test', name: 'Roster Preview Admin',
    role: 'SUPER_ADMIN', isActive: 1, password });
  for (const [id, name] of [['kitchen', 'Kitchen'], ['service', 'Front of House']]) {
    await repo.create('eim_structures', { id, name, code: id, structureType: 'Department', status: 'Active' });
  }
  for (const employee of [
    { id: employeeId, firstName: 'Nimali', lastName: 'Jayasinghe', departmentId: 'kitchen', designation: 'Chef', employeeNumber: 'DEMO-001' },
    { id: serverId, firstName: 'Kavindu', lastName: 'Silva', departmentId: 'service', designation: 'Server', employeeNumber: 'DEMO-002' },
    { id: 'roster-host-employee', firstName: 'Ayesha', lastName: 'Fernando', departmentId: 'service', designation: 'Host', employeeNumber: 'DEMO-003' },
  ]) {
    await repo.create('employee_information_employees', { ...employee, organizationalRank: 'EMPLOYEE', status: 'Active', isActive: 1 });
  }
  for (const shift of [
    { id: dayId, code: 'DAY', name: 'Day Service', startTime: '09:00', endTime: '17:00' },
    { id: eveningId, code: 'PM', name: 'Dinner Service', startTime: '14:00', endTime: '22:00' },
    { id: nightId, code: 'NIGHT', name: 'Overnight Prep', startTime: '21:00', endTime: '06:00', crossMidnight: 1 },
    { id: earlyId, code: 'AM', name: 'Breakfast Prep', startTime: '05:00', endTime: '13:00', holidayRule: 'Off' },
  ]) {
    await repo.create('attendance_shifts', { ...shift, status: 'Active', fullDayHours: 8, shiftType: 'Fixed' });
  }
  return repo;
}
