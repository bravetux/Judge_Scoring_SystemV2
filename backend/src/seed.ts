import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, run } from './database/db';
import { hashPassword } from './utils/auth';

dotenv.config();

async function seedUsers() {
  console.log('Initializing database...');
  await initializeDatabase();

  console.log('Seeding users...');

  // Admin user
  const adminId = uuidv4();
  const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'admin123');

  await run(
    `INSERT OR REPLACE INTO users (id, username, email, password, role, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, 'admin', 'admin@dancejudge.com', adminPassword, 'admin', new Date().toISOString()]
  );
  console.log('✓ Admin user created');

  // View-only user (read-only access to Results tab)
  const viewUserId = uuidv4();
  const viewPassword = await hashPassword(process.env.VIEW_PASSWORD || 'view123');

  await run(
    `INSERT OR REPLACE INTO users (id, username, email, password, role, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [viewUserId, 'view', 'view@dancejudge.com', viewPassword, 'view', new Date().toISOString()]
  );
  console.log('✓ View user created (read-only Results access)');

  // Judge users
  for (let i = 1; i <= 15; i++) {
    const judgeUserId = uuidv4();
    const judgeId = uuidv4();
    const username = `judge${i}`;
    const password = await hashPassword(username); // Password is same as username

    await run(
      `INSERT OR REPLACE INTO users (id, username, email, password, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [judgeUserId, username, `${username}@dancejudge.com`, password, 'judge', new Date().toISOString()]
    );

    await run(
      `INSERT OR REPLACE INTO judges (id, userId, name, assignedCategories)
       VALUES (?, ?, ?, ?)`,
      [judgeId, judgeUserId, `Judge ${i}`, JSON.stringify([])]
    );

    console.log(`✓ Judge ${i} created (username: ${username}, password: ${username})`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\nCredentials:');
  console.log('  Admin:  admin / ' + (process.env.ADMIN_PASSWORD || 'admin123'));
  console.log('  View:   view  / ' + (process.env.VIEW_PASSWORD || 'view123') + '  (read-only Results)');
  console.log('  Judges: judge1-judge15 / password same as username (e.g., judge1/judge1)');
  console.log('  Note: Assign categories to judges through Admin Dashboard');

  process.exit(0);
}

seedUsers().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
