const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/dance_judge.db');

// Count all entries
db.all('SELECT COUNT(*) as total FROM danceEntries', [], (err, rows) => {
  if (err) {
    console.error('Error counting entries:', err);
    return;
  }
  console.log('\n=== Total entries in database:', rows[0].total, '===\n');
  
  // Get entries by category
  db.all('SELECT categoryCode, COUNT(*) as count FROM danceEntries GROUP BY categoryCode', [], (err, rows) => {
    if (err) {
      console.error('Error grouping by category:', err);
      return;
    }
    console.log('Entries by category:');
    rows.forEach(r => console.log(`  ${r.categoryCode}: ${r.count} entries`));
    
    // Get sample entries
    db.all('SELECT * FROM danceEntries LIMIT 5', [], (err, rows) => {
      if (err) {
        console.error('Error fetching sample entries:', err);
        return;
      }
      console.log('\nSample entries:');
      rows.forEach(r => {
        console.log(`  ${r.categoryCode}${String(r.entryNumber).padStart(2, '0')} - ${r.participant1Name}${r.participant2Name ? ' & ' + r.participant2Name : ''}`);
      });
      
      db.close();
    });
  });
});
