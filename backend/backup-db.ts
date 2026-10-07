import * as dotenv from 'dotenv';
dotenv.config();
import { db } from './src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function backup() {
  console.log('--- STARTING BACKUP ---');
  try {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Backup employee_information_employees
    const [employees] = await db.query('SELECT * FROM employee_information_employees');
    fs.writeFileSync(path.join(backupDir, `employee_information_employees_${timestamp}.json`), JSON.stringify(employees, null, 2));
    console.log(`Backed up ${((employees as any).length)} records from employee_information_employees`);
    
    // Backup reporting_relationships
    const [reporting] = await db.query('SELECT * FROM reporting_relationships');
    fs.writeFileSync(path.join(backupDir, `reporting_relationships_${timestamp}.json`), JSON.stringify(reporting, null, 2));
    console.log(`Backed up ${((reporting as any).length)} records from reporting_relationships`);
    
    // Backup attendance_roster_assignments
    const [roster] = await db.query('SELECT * FROM attendance_roster_assignments');
    fs.writeFileSync(path.join(backupDir, `attendance_roster_assignments_${timestamp}.json`), JSON.stringify(roster, null, 2));
    console.log(`Backed up ${((roster as any).length)} records from attendance_roster_assignments`);

    console.log('--- BACKUP COMPLETE ---');
  } catch (e) {
    console.error('Backup Failed: ', e);
  } finally {
    process.exit(0);
  }
}

backup();
