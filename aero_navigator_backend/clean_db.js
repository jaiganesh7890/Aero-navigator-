// One-off: delete cached flights that have timezone-split city names like "Kolkata" for Chennai
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'aero_navigator.db');
const db = new Database(dbPath);

// Show what we have
const sample = db.prepare("SELECT id, departure_city, arrival_city FROM flights LIMIT 10").all();
console.log("Sample before cleanup:", JSON.stringify(sample, null, 2));

// Delete rows where city looks like a timezone component (no spaces, but common timezone fragment list)
// OR just clear all cache so everything refreshes fresh on next search
const del = db.prepare("DELETE FROM flights").run();
console.log(`Cleared all cached flights: ${del.changes} rows deleted.`);
console.log("Flight cache cleared. Fresh correct data will be fetched/generated on next search.");

db.close();
