// Run from backend after backup-system.cjs. Additive, audited, idempotent reconciliation.
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const migration = '20260924-owner-27-employees';
const ranks = ['OWNER', 'CEO', 'DIRECTOR', 'DEPARTMENT_HEAD', 'MANAGER', 'TEAM_LEAD', 'SENIOR', 'EMPLOYEE'];
const labels = ['Owner', 'CEO', 'Director', 'Department Head', 'Manager', 'Assistant Manager / Team Lead', 'Senior', 'Employee'];
async function run() {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const credentials = [];
  try {
    await c.query('CREATE TABLE IF NOT EXISTS hr_repair_migrations (id VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, report JSON)');
    const [[done]] = await c.query('SELECT id FROM hr_repair_migrations WHERE id = ?', [migration]);
    if (done) { console.log('Organization reconciliation already applied; no data changed.'); return; }
    for (const [table, column, definition] of [
      ['employee_information_employees', 'organizationalRank', "VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEE'"],
      ['users', 'mustChangePassword', 'TINYINT(1) NOT NULL DEFAULT 0']
    ]) {
      const [columns] = await c.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
      if (!columns.length) await c.query(`ALTER TABLE ?? ADD COLUMN ?? ${definition}`, [table, column]);
    }
    await c.beginTransaction();
    const [employees] = await c.query(`SELECT e.*, p.fullName, w.companyId AS wsCompanyId, u.id AS validUserId FROM employee_information_employees e LEFT JOIN employee_information_personal_details p ON p.employeeId=e.id LEFT JOIN employee_information_workstation_details w ON w.employeeId=e.id LEFT JOIN users u ON u.id=e.userId ORDER BY e.employeeNumber FOR UPDATE`);
    if (employees.length !== 27 || employees.some(e => e.status !== 'Active')) throw new Error('Workforce changed; inspect before rerunning the reconciliation.');
    const owner = employees.find(e => e.employeeNumber === 'EMP-001' && /praveen/i.test(e.firstName));
    const ceo = employees.find(e => e.employeeNumber === 'EMP-003' && /dilan/i.test(e.firstName));
    if (!owner || !ceo) throw new Error('Verified Owner/CEO records no longer match.');
    const [users] = await c.query('SELECT id, email FROM users');
    const knownEmails = new Set(users.map(u => u.email.toLowerCase()));
    for (const e of employees.filter(e => !e.validUserId)) {
      if (!e.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email) || knownEmails.has(e.email.toLowerCase())) throw new Error(`Resolve missing/duplicate email for ${e.employeeNumber} before provisioning.`);
      knownEmails.add(e.email.toLowerCase());
      const password = randomBytes(18).toString('base64url');
      e.userId = e.userId || randomUUID();
      await c.query(`INSERT INTO users (id,email,name,password,role,isActive,mustChangePassword,createdAt,updatedAt) VALUES (?,?,?,?,'EMPLOYEE',1,1,NOW(),NOW())`, [e.userId, e.email, e.fullName || `${e.firstName} ${e.lastName}`, await bcrypt.hash(password, 12)]);
      credentials.push({ employeeNumber: e.employeeNumber, name: e.fullName || `${e.firstName} ${e.lastName}`, email: e.email, temporaryPassword: password });
    }
    const [structures] = await c.query('SELECT * FROM eim_structures');
    const rootStructure = structures.find(s => s.structureType === 'Company');
    const titles = new Map();
    for (let i = 0; i < ranks.length; i++) {
      const [[existing]] = await c.query('SELECT id FROM eim_corporate_titles WHERE code = ?', [`ORG-${ranks[i]}`]);
      const id = existing?.id || randomUUID(); titles.set(ranks[i], id);
      if (!existing) await c.query('INSERT INTO eim_corporate_titles (id,code,name,level,isActive) VALUES (?,?,?,?,1)', [id, `ORG-${ranks[i]}`, labels[i], i + 1]);
    }
    const changes = [];
    for (const e of employees) {
      const before = { ...e };
      let rank = /senior/i.test(e.designation) ? 'SENIOR' : /lead/i.test(e.designation) ? 'TEAM_LEAD' : /head of/i.test(e.designation) ? 'DEPARTMENT_HEAD' : /chief financial/i.test(e.designation) ? 'DIRECTOR' : 'EMPLOYEE';
      if (e.id === owner.id) { rank = 'OWNER'; e.designation = 'Owner / Founder'; e.reportingManagerId = null; }
      else if (e.id === ceo.id) { rank = 'CEO'; e.designation = 'Chief Executive Officer'; e.department = 'Executive Management'; e.reportingManagerId = owner.id; }
      else if (e.reportingManagerId === owner.id) e.reportingManagerId = ceo.id;
      let department = structures.find(s => s.structureType === 'Department' && s.name.toLowerCase() === e.department.toLowerCase());
      if (!department) {
        department = { id: randomUUID(), name: e.department, structureType: 'Department' };
        const division = structures.find(s => s.structureType === 'Division' && s.name === e.department);
        await c.query(`INSERT INTO eim_structures (id,code,name,structureType,parentId,companyId,isActive,status) VALUES (?,?,?,'Department',?,?,1,'Active')`, [department.id, `ORG-${randomBytes(5).toString('hex')}`, e.department, division?.id || rootStructure?.id || null, e.companyId || e.wsCompanyId || null]);
        structures.push(department);
      }
      const [[existingDesignation]] = await c.query('SELECT id FROM designations WHERE name = ? AND (departmentId = ? OR departmentId IS NULL) LIMIT 1', [e.designation, department.id]);
      const designationId = existingDesignation?.id || randomUUID();
      if (!existingDesignation) await c.query(`INSERT INTO designations (id,code,name,departmentId,corporateTitleId,isActive) VALUES (?,?,?,?,?,1)`, [designationId, `ORG-${randomBytes(5).toString('hex')}`, e.designation, department.id, titles.get(rank)]);
      else await c.query('UPDATE designations SET departmentId=?, corporateTitleId=? WHERE id=?', [department.id, titles.get(rank), designationId]);
      const [[profile]] = await c.query('SELECT id FROM eim_job_profiles WHERE designationId=? AND departmentId=? LIMIT 1', [designationId, department.id]);
      const profileId = profile?.id || randomUUID();
      if (!profile) await c.query('INSERT INTO eim_job_profiles (id,code,title,designationId,departmentId,isActive) VALUES (?,?,?,?,?,1)', [profileId, `ORG-${randomBytes(5).toString('hex')}`, e.designation, designationId, department.id]);
      const [[type]] = await c.query('SELECT id,name FROM employment_types WHERE id=? OR name=? ORDER BY (id=?) DESC LIMIT 1', [e.employmentTypeId, e.employmentType, e.employmentTypeId]);
      const companyId = e.companyId || e.wsCompanyId || null;
      await c.query(`UPDATE employee_information_employees SET userId=?,organizationalRank=?,designation=?,department=?,designationId=?,departmentId=?,jobProfileId=?,companyId=?,reportingManagerId=?,employmentTypeId=?,employmentType=?,updatedAt=NOW() WHERE id=?`, [e.userId, rank, e.designation, e.department, designationId, department.id, profileId, companyId, e.reportingManagerId, type?.id || null, type?.name || e.employmentType, e.id]);
      const [[ws]] = await c.query('SELECT id FROM employee_information_workstation_details WHERE employeeId=?', [e.id]);
      if (!ws) await c.query('INSERT INTO employee_information_workstation_details (id,employeeId) VALUES (?,?)', [randomUUID(), e.id]);
      await c.query(`UPDATE employee_information_workstation_details SET departmentId=?,designationId=?,jobProfileId=?,companyId=?,employmentTypeId=?,updatedAt=NOW() WHERE employeeId=?`, [department.id, designationId, profileId, companyId, type?.id || null, e.id]);
      const [relations] = await c.query(`SELECT id,manager_id FROM reporting_relationships WHERE employee_id=? AND relationship_type='PRIMARY' AND status='Active'`, [e.id]);
      if (relations.length !== (e.reportingManagerId ? 1 : 0) || relations.some(r => r.manager_id !== e.reportingManagerId)) {
        await c.query(`UPDATE reporting_relationships SET status='Previous',effective_end_date=CURDATE(),updated_by=?,updated_at=NOW() WHERE employee_id=? AND relationship_type='PRIMARY' AND status='Active'`, [owner.userId, e.id]);
        if (e.reportingManagerId) await c.query(`INSERT INTO reporting_relationships (id,employee_id,manager_id,relationship_type,effective_start_date,status,reason,created_by,updated_by) VALUES (?,?,?,'PRIMARY',CURDATE(),'Active',?,?,?)`, [randomUUID(), e.id, e.reportingManagerId, 'Owner/CEO organizational reconciliation', owner.userId, owner.userId]);
      }
      if (before.reportingManagerId !== e.reportingManagerId) await c.query(`INSERT INTO reporting_hierarchy_audit (id,employee_id,action,previous_manager_id,new_manager_id,effective_date,reason,changed_by,created_at) VALUES (?,?,'REASSIGN',?,?,CURDATE(),?,?,NOW())`, [randomUUID(), e.id, before.reportingManagerId, e.reportingManagerId, 'Owner/CEO organizational reconciliation', owner.userId]);
      await c.query(`INSERT INTO employee_information_audit_logs (id,employeeId,userId,action,fieldChanged,previousValue,newValue,createdAt) VALUES (?,?,?,'RECONCILE','organization',?,?,NOW())`, [randomUUID(), e.id, owner.userId, JSON.stringify({ rank: before.organizationalRank, departmentId: before.departmentId, designationId: before.designationId, managerId: before.reportingManagerId }), JSON.stringify({ rank, departmentId: department.id, designationId, managerId: e.reportingManagerId })]);
      e.organizationalRank = rank;
      changes.push({ id: e.id, employeeNumber: e.employeeNumber, name: e.fullName || `${e.firstName} ${e.lastName}`, rank, designation: e.designation, department: e.department, managerId: e.reportingManagerId, userId: e.userId });
    }
    const byId = new Map(employees.map(e => [e.id, e]));
    for (const e of employees) {
      const seen = new Set([e.id]); let cursor = e;
      while (cursor.reportingManagerId) {
        const m = byId.get(cursor.reportingManagerId);
        if (!m || seen.has(m.id) || ranks.indexOf(m.organizationalRank) >= ranks.indexOf(cursor.organizationalRank)) throw new Error(`Invalid reporting path: ${e.employeeNumber}`);
        seen.add(m.id); cursor = m;
      }
      if (cursor.id !== owner.id) throw new Error('Orphan reporting path');
      await c.query('UPDATE users SET supervisorId=? WHERE id=?', [byId.get(e.reportingManagerId)?.userId || null, e.userId]);
    }
    // Existing access rows remain. Give executives/actual leaders read-only views without granting HR write authority.
    for (const e of employees) {
      const executive = ['OWNER','CEO'].includes(e.organizationalRank);
      const manager = employees.some(sub => sub.reportingManagerId === e.id);
      const modules = ['self_service', 'performance_management', ...(manager || executive ? ['reports_analytics', 'reporting_hierarchy'] : []), ...(executive ? ['employee_information', 'attendance_management'] : [])];
      for (const moduleId of modules) {
        const [[existing]] = await c.query('SELECT id FROM user_module_permissions WHERE userId=? AND moduleId=?', [e.userId,moduleId]);
        if (existing) await c.query('UPDATE user_module_permissions SET moduleAccess=1,canView=1,dataScope=? WHERE id=?', [executive?'ALL':manager?'DIRECT_REPORTS':'OWN', existing.id]);
        else await c.query('INSERT INTO user_module_permissions (id,userId,moduleId,moduleAccess,canView,dataScope) VALUES (?,?,?,1,1,?)', [randomUUID(),e.userId,moduleId,executive?'ALL':manager?'DIRECT_REPORTS':'OWN']);
      }
    }
    for (let i = 0; i < labels.length; i++) await c.query('INSERT INTO reporting_hierarchy_levels (depth,name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [i, labels[i]]);
    const report = changes.map(e => ({ ...e, reportsTo: byId.get(e.managerId)?.fullName || null, mappingStatus: 'Linked active account' }));
    await c.query('INSERT INTO hr_repair_migrations (id,report) VALUES (?,?)', [migration, JSON.stringify(report)]);
    // Persist handover before commit: a disk failure must not create inaccessible accounts.
    const folder = path.resolve(__dirname, '../backups'); fs.mkdirSync(folder, {recursive:true});
    const credentialFile = path.join(folder, 'new-employee-credentials-20260924.json');
    fs.writeFileSync(credentialFile, JSON.stringify(credentials, null, 2), { flag: 'wx', mode: 0o600 });
    await c.commit();
    fs.writeFileSync(path.resolve(__dirname, '../../repair-audit/final-organization.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ employees: employees.length, accountsCreated: credentials.length, credentialFile, CEO: ceo.fullName, Owner: owner.fullName }));
  } catch (e) { await c.rollback(); throw e; }
  finally { await c.end(); }
}
run().catch(e => { console.error(e.message); process.exitCode = 1; });
