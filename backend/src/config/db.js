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

// Promise wrapper helpers for compatibility
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
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
      db.exec(sql);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  db,
  query,
  get,
  run,
  exec
};
