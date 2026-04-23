const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/dance_judge.db');

console.log('\n=== Detailed Judge Assignments ===\n');

db.all(`
  SELECT 
    j.id as judgeId,
    j.name as judgeName,
    j.assignedCategories,
    u.id as userId,
    u.username,
    u.email
  FROM judges j
  JOIN users u ON j.userId = u.id
  WHERE u.username IN ('judge1', 'judge2', 'judge3')
  ORDER BY u.username
`, [], (err, judges) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  judges.forEach(judge => {
    console.log(`${judge.judgeName} (${judge.username})`);
    console.log(`  User ID: ${judge.userId}`);
    console.log(`  Judge ID: ${judge.judgeId}`);
    console.log(`  Assigned Categories: ${judge.assignedCategories}`);
    console.log(`  Parsed: ${JSON.stringify(JSON.parse(judge.assignedCategories))}`);
    console.log('');
  });
  
  db.close();
});
