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

export async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('candidate','recruiter','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      candidate_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      cv_path TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );
  `);
}