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
  db = new Database(dbPath);
  console.log('Connected to SQLite database at', dbPath);
} catch (err) {
  console.error('Error opening database:', err.message);
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
  return new Promise((resolve, reject) => {
    try {
      initTables();
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      initTables();
      const stmt = db.prepare(sql);
      const row = stmt.get(...params);
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      initTables();
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      resolve({ id: info.lastInsertRowid, changes: info.changes });
    } catch (err) {
      reject(err);
    }
  });
};

const exec = (sql) => {
  return new Promise((resolve, reject) => {
    try {
      initTables();
      db.exec(sql);
      resolve();
    } catch (err) {
      reject(err);
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
