const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/dance_judge.db');

console.log('\n=== Checking Judge Assignments ===\n');

// Get all judges with their assignments
db.all(`
  SELECT j.id, j.name, j.assignedCategories, u.username, u.email
  FROM judges j
  JOIN users u ON j.userId = u.id
  ORDER BY j.name
`, [], (err, judges) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${judges.length} judges:\n`);
  
  judges.forEach((judge, index) => {
    console.log(`${index + 1}. ${judge.name}`);
    console.log(`   Username: ${judge.username}`);
    console.log(`   Judge ID: ${judge.id}`);
    console.log(`   User ID: ${judge.userId}`);
    console.log(`   Assigned Categories: ${judge.assignedCategories}`);
    console.log('');
  });
  
  db.close();
});
