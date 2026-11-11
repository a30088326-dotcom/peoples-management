import { randomUUID } from 'node:crypto';
import { organizationAccess } from '../../../shared/services/organization.service';
import { isOrganizationScope } from '../../../shared/services/access-scope';
import { storageNow } from '../../../storage/repository';
import { RosterError } from '../roster-validation';
import { dayIssues, planConflicts, scheduleContext } from './calendar';
import { addDays, applyChange, datesBetween, OFF, plannedDay, readPlan, shiftInterval, type Draft, type Plan, type RosterRow, type ShiftChange } from './pattern';
import { rosterReader, rosterTransaction, type Writer } from './store';

const memberIds = (plan: Draft) => plan.employees.map(member => member.employeeId);

async function rosterDirectory(userId: string) {
  const reader = rosterReader();
  const [access, employeeRows, workstations, structures, permissions] = await Promise.all([
    organizationAccess(userId), reader.list('employee_information_employees'),
    reader.list('employee_information_workstation_details'),
    reader.list('eim_structures', row => row.structureType === 'Department'),
    reader.list('user_module_permissions', row => row.userId === userId && row.moduleId === 'attendance_management'),
  ]);
  const employeeMap = new Map(employeeRows.map(employee => [employee.id, employee]));
  const workstationMap = new Map(workstations.map(row => [row.employeeId, row]));
  const departmentMap = new Map(structures.map(row => [row.id, row.name]));
  const departmentFor = (id: string) => workstationMap.get(id)?.departmentId || employeeMap.get(id)?.departmentId || '';
  const scope = access.superAdmin || !permissions[0] ? undefined : permissions[0].dataScope || 'OWN';
  const permitted = new Set(access.visibleIds);
  const ownDepartment = access.employeeId && departmentFor(access.employeeId);
  const team = new Set(access.teamIds);
  const employees = access.employees.filter(employee => {
    if (!scope) return access.admin || access.isExecutive || permitted.has(employee.id);
    if (!employee.active) return false;
    if (employee.id === access.employeeId || isOrganizationScope(scope)) return true;
    if (scope === 'DEPARTMENT') return Boolean(ownDepartment && departmentFor(employee.id) === ownDepartment);
    if (scope === 'DIRECT_REPORTS') return employee.managerId === access.employeeId && !!access.employeeId;
    return scope === 'TEAM' && team.has(employee.id);
  }).map(employee => {
    const departmentId = departmentFor(employee.id);
    return { id: employee.id, name: employee.name, employeeNumber: employee.employeeNumber, departmentId,
      department: departmentMap.get(departmentId) || employee.department, designation: employee.designation, active: employee.active };
  });
  const departments = structures.filter(row => row.status !== 'Inactive' && Number(row.isActive ?? 1) === 1)
    .map(row => ({ id: row.id as string, name: row.name as string })).sort((a, b) => a.name.localeCompare(b.name));
  return { employees, departments };
}

async function assertScope(userId: string, employeeIds: string[]) {
  const { employees } = await rosterDirectory(userId);
  const visible = new Set(employees.filter(employee => employee.active).map(employee => employee.id));
  if (employeeIds.some(id => !visible.has(id))) throw new RosterError(403, 'One or more employees are outside your active roster scope.');
}

export async function rosterOptions(userId: string) {
  const reader = rosterReader();
  const [directory, rows, shifts] = await Promise.all([
    rosterDirectory(userId), reader.list('attendance_roster_groups'), reader.list('attendance_shifts', row => row.status === 'Active'),
  ]);
  const visible = new Set(directory.employees.map(employee => employee.id));
  const rosters = rows.flatMap(row => {
    const plan = readPlan(row);
    if (!plan || !plan.employees.some(member => visible.has(member.employeeId))) return [];
    return [{ id: row.id, name: plan.name, startDate: plan.startDate, endDate: plan.endDate, repeat: plan.repeat,
      status: row.status === 'Active' ? 'Published' : 'Draft', version: plan.version,
      employeeCount: plan.employees.filter(member => visible.has(member.employeeId)).length }];
  }).sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name));
  return {
    employees: directory.employees.filter(employee => employee.active), departments: directory.departments,
    shifts: shifts.map(({ id, name, startTime, endTime, crossMidnight }) => ({ id, name, startTime, endTime,
      overnight: Boolean(shiftInterval('2000-01-01', { startTime, endTime, crossMidnight })?.overnight) })),
    rosters, legacy: rows.filter(row => !row.schedulePlan).map(row => ({ id: row.id, name: row.name })),
  };
}

function expectPlan(row?: RosterRow, version?: number) {
  const plan = readPlan(row);
  if (!row || !plan) throw new RosterError(404, 'Roster not found.');
  if (version !== undefined && plan.version !== version) throw new RosterError(409, 'This roster was changed elsewhere. Refresh it before saving.');
  return plan;
}

export async function rosterDetail(userId: string, id: string) {
  const row = (await rosterReader().list('attendance_roster_groups', record => record.id === id))[0] as RosterRow | undefined;
  const plan = expectPlan(row);
  await assertScope(userId, memberIds(plan));
  return { id, ...plan, status: row!.status === 'Active' ? 'Published' : 'Draft' };
}

async function checkShifts(tx: Writer, shiftIds: string[]) {
  const ids = [...new Set(shiftIds.filter(id => id !== OFF))];
  if (ids.length > 20) throw new RosterError(400, 'Use at most 20 distinct shifts in a roster.');
  const shifts = await tx.lockShifts(ids);
  if (shifts.length !== ids.length || shifts.some(shift => shift.status !== 'Active' || !shiftInterval('2000-01-01', shift))) {
    throw new RosterError(400, 'One of the shifts is inactive, missing, or has invalid hours. Check Shift Management.');
  }
}

function assertPlanSize(plan: Plan) {
  if (Buffer.byteLength(JSON.stringify(plan), 'utf8') > 280_000) throw new RosterError(409, 'This roster has reached its saved exception limit. Use a separate roster for additional dates.');
}

export async function saveDraft(userId: string, draft: Draft, edit?: { id: string; version: number }) {
  return rosterTransaction(async tx => {
    let row: RosterRow;
    if (edit) {
      const current = await tx.getRoster(edit.id);
      const previous = expectPlan(current, edit.version);
      await assertScope(userId, memberIds(previous));
      if (current!.status !== 'Draft') throw new RosterError(409, 'Use the calendar to change a published roster.');
      row = current!;
    } else {
      const id = randomUUID();
      row = { id, code: `RST-${id.slice(0, 8).toUpperCase()}`, name: draft.name, status: 'Draft' };
    }
    await assertScope(userId, memberIds(draft));
    await checkShifts(tx, draft.employees.flatMap(member => member.shifts));
    const plan = { ...draft, version: (edit?.version ?? 0) + 1, exceptions: [] };
    await tx.saveRoster(row, plan, 'Draft');
    return { id: row.id, version: plan.version };
  });
}

export async function publishRoster(userId: string, id: string, version: number) {
  return rosterTransaction(async tx => {
    const row = await tx.getRoster(id);
    const plan = expectPlan(row, version);
    if (row!.status !== 'Draft') throw new RosterError(409, 'This roster is already published.');
    const ids = memberIds(plan);
    await assertScope(userId, ids);
    await tx.lockEmployees(ids);
    await checkShifts(tx, plan.employees.flatMap(member => member.shifts));
    const context = await scheduleContext(tx, ids, plan.startDate, plan.endDate);
    const conflicts = planConflicts(context, id, plan);
    if (conflicts.length) throw new RosterError(409, 'Resolve the schedule conflicts before publishing.', conflicts);
    const next = { ...plan, version: plan.version + 1, publishedAt: storageNow(), publishedBy: userId };
    await tx.saveRoster(row!, next, 'Active');
    for (const employeeId of ids) await tx.addAssignment(id, employeeId, next);
    return { id, version: next.version };
  });
}

export async function changePublishedShift(userId: string, id: string, change: ShiftChange) {
  return rosterTransaction(async tx => {
    const row = await tx.getRoster(id);
    const plan = expectPlan(row, change.version);
    if (row!.status !== 'Active') throw new RosterError(409, 'Edit this roster from its draft form.');
    const next = applyChange(plan, change);
    assertPlanSize(next);
    await assertScope(userId, [change.employeeId]);
    await tx.lockEmployees([change.employeeId]);
    await checkShifts(tx, [change.shiftId]);
    const context = await scheduleContext(tx, [change.employeeId], plan.startDate, plan.endDate);
    const conflicts = planConflicts(context, id, next, plan, change.employeeId);
    if (conflicts.length) throw new RosterError(409, 'This change conflicts with the schedule or a locked date.', conflicts);
    await tx.saveRoster(row!, { ...next, version: plan.version + 1 }, 'Active');
    return { id, version: plan.version + 1 };
  });
}

export async function rosterCalendar(userId: string, query: { from: string; to: string; departmentId?: string; rosterId?: string }) {
  const directory = await rosterDirectory(userId);
  const employees = directory.employees.filter(employee => !query.departmentId || employee.departmentId === query.departmentId);
  const days = datesBetween(query.from, query.to);
  const context = await scheduleContext(rosterReader(), employees.map(employee => employee.id), query.from, query.to);
  const requested = query.rosterId ? context.groups.get(query.rosterId) : undefined;
  const preview = requested?.row.status === 'Draft' ? requested.plan : undefined;
  return {
    preview: Boolean(preview), days: days.map(date => ({ date, holidays: context.holidayNames.get(date) || [] })),
    employees: employees.flatMap(employee => {
      const cells = days.map(date => {
        const proposed = preview && plannedDay(preview, employee.id, date);
        const entries = context.existing(employee.id, date);
        const current = proposed && requested
          ? { ...proposed, rosterId: requested.row.id, rosterName: requested.row.name, version: preview!.version, editable: false }
          : entries.find(day => !query.rosterId || day.rosterId === query.rosterId);
        const lock = context.lockReason(employee.id, date);
        const leave = context.onLeave(employee.id, date);
        if (!current) return { date, leave, lock };
        const shift = context.shiftMap.get(current.shiftId);
        const time = shiftInterval(date, shift);
        const currentPlan = proposed ? preview : context.groups.get(current.rosterId)?.plan;
        const issues = currentPlan ? dayIssues(context, currentPlan, current.rosterId, employee.id, date, current.shiftId)
          .filter(issue => issue !== lock && !(leave && issue === 'Approved leave overlaps this shift'))
          : [...(current.shiftId !== OFF && !time ? ['Shift unavailable or missing valid hours'] : []),
            ...(current.shiftId !== OFF && (leave || time?.overnight && context.onLeave(employee.id, addDays(date, 1))) ? ['Approved leave overlaps this shift'] : []),
            ...(entries.length > 1 ? ['Overlapping roster assignments'] : [])];
        return { ...current, date, leave, lock, issues, editable: current.editable && !lock && employee.active,
          shift: shift ? { id: shift.id, name: shift.name, startTime: shift.startTime, endTime: shift.endTime, overnight: Boolean(time?.overnight) } : undefined };
      });
      return query.rosterId && !cells.some(cell => 'rosterId' in cell) ? [] : [{ ...employee, cells }];
    }),
  };
}
