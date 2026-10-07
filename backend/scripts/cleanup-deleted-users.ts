import 'dotenv/config';
import { db } from '../src/lib/db';
import { RowDataPacket } from 'mysql2';

async function cleanup() {
  const [deletedUsers] = await db.query<RowDataPacket[]>('SELECT id, email FROM users WHERE isActive = 0');
  
  if (deletedUsers.length === 0) {
    console.log("No soft-deleted users found to clean up.");
    process.exit(0);
  }

  console.log(`Found ${deletedUsers.length} soft-deleted users. Hard deleting their data...`);

  for (const user of deletedUsers) {
    console.log(`Deleting data for user ${user.id} (${user.email})`);
    const id = user.id;
    const email = user.email;

    await db.query('DELETE FROM employee_information_employees WHERE userId = ?', [id]);
    await db.query('DELETE FROM documents WHERE candidateId = ?', [id]);
    await db.query('DELETE FROM contracts WHERE candidateId = ?', [id]);
    await db.query('DELETE FROM onboarding_profiles WHERE candidateId = ?', [id]);
    await db.query('DELETE FROM invites WHERE email = ?', [email]);
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }

  console.log("Cleanup complete!");
  process.exit(0);
}

cleanup().catch(e => {
  console.error(e);
  process.exit(1);
});
