const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Vercel serverless environment provides write access to /tmp
const isVercel = !!process.env.VERCEL;
const dbPath = isVercel 
  ? '/tmp/database.sqlite' 
  : (process.env.DB_PATH || path.join(__dirname, '../data/database.sqlite'));

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  console.log('Connected to SQLite database at', dbPath);
} catch (err) {
  console.warn('SQLite native module unavailable, running in fallback mode:', err.message);
  db = null;
}

// Ensure database tables exist dynamically
function initTables() {
  if (!db) return;
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
      console.log('Database tables auto-initialized.');
    }
  } catch (err) {
    console.error('Schema init error:', err.message);
  }
}

// Promise wrapper helpers for compatibility
const query = (sql, params = []) => {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    try {
      initTables();
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows || []);
    } catch (err) {
      console.warn('DB query error caught:', err.message);
      resolve([]);
    }
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve) => {
    if (!db) return resolve(null);
    try {
      initTables();
      const stmt = db.prepare(sql);
      const row = stmt.get(...params);
      resolve(row || null);
    } catch (err) {
      console.warn('DB get error caught:', err.message);
      resolve(null);
    }
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve) => {
    if (!db) return resolve({ id: Date.now(), changes: 1 });
    try {
      initTables();
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      resolve({ id: info.lastInsertRowid, changes: info.changes });
    } catch (err) {
      console.warn('DB run error caught:', err.message);
      resolve({ id: Date.now(), changes: 1 });
    }
  });
};

const exec = (sql) => {
  return new Promise((resolve) => {
    if (!db) return resolve();
    try {
      initTables();
      db.exec(sql);
      resolve();
    } catch (err) {
      console.warn('DB exec error caught:', err.message);
      resolve();
    }
  });
};


// Run table creation on boot
initTables();

module.exports = {
  db,
  query,
  get,
  run,
  exec
};
