import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "..", "data.sqlite");
export const db = new sqlite3.Database(dbPath);

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function hasColumn(tableName, columnName) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
}

async function ensureColumn(tableName, columnName, sqlTypeAndDefault) {
  const exists = await hasColumn(tableName, columnName);
  if (!exists) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlTypeAndDefault}`);
  }
}

export async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('candidate','recruiter','admin')),
      full_name TEXT,
      phone TEXT,
      bio TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      website TEXT,
      description TEXT,
      logo_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      contract_type TEXT NOT NULL,
      remote INTEGER NOT NULL DEFAULT 0,
      salary_min INTEGER,
      salary_max INTEGER,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      candidate_user_id INTEGER,
      candidate_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      recruiter_note TEXT,
      cv_path TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','accepted','rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY(candidate_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await ensureColumn("users", "full_name", "TEXT");
  await ensureColumn("users", "phone", "TEXT");
  await ensureColumn("users", "bio", "TEXT");
  await ensureColumn("users", "is_active", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("users", "updated_at", "TEXT");

  await ensureColumn("companies", "is_active", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("companies", "updated_at", "TEXT");

  await ensureColumn("jobs", "updated_at", "TEXT");

  await ensureColumn("applications", "candidate_user_id", "INTEGER");
  await ensureColumn("applications", "recruiter_note", "TEXT");
  await ensureColumn("applications", "updated_at", "TEXT");

  await run(`UPDATE users SET updated_at = COALESCE(updated_at, created_at, datetime('now'));`);
  await run(`UPDATE companies SET updated_at = COALESCE(updated_at, created_at, datetime('now'));`);
  await run(`UPDATE jobs SET updated_at = COALESCE(updated_at, created_at, datetime('now'));`);
  await run(`UPDATE applications SET updated_at = COALESCE(updated_at, created_at, datetime('now'));`);

  await run(`CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at DESC);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_applications_candidate_user_id ON applications(candidate_user_id);`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_job_email_unique ON applications(job_id, email);`);
}
