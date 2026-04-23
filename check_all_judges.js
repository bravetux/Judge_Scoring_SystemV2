const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/dance_judge.db');

console.log('\n=== Current Judge Assignments (All Judges) ===\n');

db.all(`
  SELECT 
    j.id as judgeId,
    j.name as judgeName,
    j.assignedCategories,
    u.username
  FROM judges j
  JOIN users u ON j.userId = u.id
  ORDER BY u.username
`, [], (err, judges) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log(`Total Judges: ${judges.length}\n`);
  
  judges.forEach((judge, index) => {
    const cats = JSON.parse(judge.assignedCategories);
    console.log(`${index + 1}. ${judge.judgeName} (${judge.username})`);
    console.log(`   Categories: ${cats.length > 0 ? cats.join(', ') : 'None assigned'}`);
    console.log('');
  });
  
  db.close();
});
