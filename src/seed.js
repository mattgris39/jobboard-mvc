import bcrypt from "bcrypt";
import { initDb, run, get } from "./db/db.js";

await initDb();

const email = "recruiter@test.com";
const password = "Password123!";
const role = "recruiter";

let user = await get(`SELECT * FROM users WHERE email=?`, [email]);

let userId;
if (!user) {
  const hash = await bcrypt.hash(password, 10);
  const r = await run(
    `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    [email, hash, role]
  );
  userId = r.lastID;
} else {
  userId = user.id;
}

let company = await get(`SELECT * FROM companies WHERE user_id=?`, [userId]);
let companyId;

if (!company) {
  const c = await run(
    `INSERT INTO companies (user_id, name, website, description)
     VALUES (?, ?, ?, ?)`,
    [userId, "Jobboard Studio", "https://example.com", "Studio de recrutement tech."]
  );
  companyId = c.lastID;
} else {
  companyId = company.id;
}

const existing = await get(`SELECT COUNT(*) as n FROM jobs WHERE company_id=?`, [companyId]);
if (existing.n > 0) {
  console.log("Jobs déjà présents, seed ignoré.");
  process.exit(0);
}

const jobs = [
  ["Développeur Fullstack JS", "Nice", "CDI", 1, 38000, 52000],
  ["Développeur Front-end React", "Paris", "CDI", 0, 42000, 60000],
  ["Développeur Back-end Node.js", "Lyon", "CDI", 1, 40000, 58000],
  ["Pentester Web Junior", "Remote", "CDI", 1, 36000, 48000]
];

for (const [title, location, contract_type, remote, salary_min, salary_max] of jobs) {
  await run(
    `INSERT INTO jobs (company_id, title, location, contract_type, remote, salary_min, salary_max, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      companyId,
      title,
      location,
      contract_type,
      remote,
      salary_min,
      salary_max,
      `${title} — Offre de test pour le projet MVC.`
    ]
  );
}

console.log("Seed OK");
process.exit(0);