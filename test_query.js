const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/dance_judge.db');

// Test the exact query the backend uses
const categoryCode = 'SA';

console.log(`\n=== Testing query for category: ${categoryCode} ===\n`);

db.all(
  'SELECT * FROM danceEntries WHERE categoryCode = ? ORDER BY entryNumber',
  [categoryCode],
  (err, entries) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    console.log(`Found ${entries.length} entries for ${categoryCode}:`);
    entries.slice(0, 5).forEach(entry => {
      console.log(`  Entry ${entry.entryNumber}: ${entry.participant1Name}${entry.participant2Name ? ' & ' + entry.participant2Name : ''}`);
    });
    
    if (entries.length > 5) {
      console.log(`  ... and ${entries.length - 5} more`);
    }
    
    db.close();
  }
);
