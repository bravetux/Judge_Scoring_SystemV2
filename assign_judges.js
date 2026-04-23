const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/dance_judge.db');

console.log('\n=== Assigning Categories to Judges ===\n');

// Judge assignments
const assignments = [
  { username: 'judge1', categories: ['SA', 'SB', 'DA'] },
  { username: 'judge2', categories: ['SC', 'SD', 'DB'] },
  { username: 'judge3', categories: ['SE', 'SKG', 'DC'] }
];

let completed = 0;

assignments.forEach(assignment => {
  const categoriesJson = JSON.stringify(assignment.categories);
  
  db.run(`
    UPDATE judges 
    SET assignedCategories = ?
    WHERE id IN (
      SELECT j.id FROM judges j
      JOIN users u ON j.userId = u.id
      WHERE u.username = ?
    )
  `, [categoriesJson, assignment.username], function(err) {
    if (err) {
      console.error(`Error updating ${assignment.username}:`, err);
    } else {
      console.log(`✓ ${assignment.username} assigned to: ${assignment.categories.join(', ')}`);
    }
    
    completed++;
    if (completed === assignments.length) {
      console.log('\n=== Verification ===\n');
      
      // Verify the updates
      db.all(`
        SELECT j.name, j.assignedCategories, u.username
        FROM judges j
        JOIN users u ON j.userId = u.id
        WHERE u.username IN ('judge1', 'judge2', 'judge3')
        ORDER BY u.username
      `, [], (err, judges) => {
        if (err) {
          console.error('Error:', err);
        } else {
          judges.forEach(judge => {
            console.log(`${judge.name} (${judge.username}): ${judge.assignedCategories}`);
          });
        }
        db.close();
      });
    }
  });
});
