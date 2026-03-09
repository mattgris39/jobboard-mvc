import bcrypt from "bcrypt";
import { initDb, run, get, all } from "./db/db.js";

await initDb();

async function ensureUser({ email, password, role, fullName, phone, bio }) {
  const existing = await get(`SELECT * FROM users WHERE email = ?`, [email]);
  const hash = await bcrypt.hash(password, 10);

  if (!existing) {
    const created = await run(
      `INSERT INTO users (email, password_hash, role, full_name, phone, bio, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [email, hash, role, fullName, phone, bio]
    );
    return created.lastID;
  }

  await run(
    `UPDATE users
     SET password_hash = ?,
         role = ?,
         full_name = ?,
         phone = ?,
         bio = ?,
         is_active = 1,
         updated_at = datetime('now')
     WHERE id = ?`,
    [hash, role, fullName, phone, bio, existing.id]
  );

  return existing.id;
}

async function ensureCompany({ userId, name, website, description }) {
  const existing = await get(`SELECT * FROM companies WHERE user_id = ?`, [userId]);

  if (!existing) {
    const created = await run(
      `INSERT INTO companies (user_id, name, website, description, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, name, website, description]
    );
    return created.lastID;
  }

  await run(
    `UPDATE companies
     SET name = ?,
         website = ?,
         description = ?,
         is_active = 1,
         updated_at = datetime('now')
     WHERE id = ?`,
    [name, website, description, existing.id]
  );

  return existing.id;
}

async function ensureJob(companyId, payload) {
  const existing = await get(
    `SELECT id FROM jobs WHERE company_id = ? AND title = ? LIMIT 1`,
    [companyId, payload.title]
  );

  if (!existing) {
    const created = await run(
      `INSERT INTO jobs (
        company_id, title, location, contract_type, remote,
        salary_min, salary_max, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        payload.title,
        payload.location,
        payload.contractType,
        payload.remote,
        payload.salaryMin,
        payload.salaryMax,
        payload.description,
        payload.status
      ]
    );
    return created.lastID;
  }

  await run(
    `UPDATE jobs
     SET location = ?,
         contract_type = ?,
         remote = ?,
         salary_min = ?,
         salary_max = ?,
         description = ?,
         status = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      payload.location,
      payload.contractType,
      payload.remote,
      payload.salaryMin,
      payload.salaryMax,
      payload.description,
      payload.status,
      existing.id
    ]
  );

  return existing.id;
}

async function ensureApplication(payload) {
  const existing = await get(
    `SELECT id FROM applications WHERE job_id = ? AND email = ? LIMIT 1`,
    [payload.jobId, payload.email]
  );

  if (!existing) {
    await run(
      `INSERT INTO applications (
        job_id, candidate_user_id, candidate_name, email, phone,
        message, cv_path, status, recruiter_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.jobId,
        payload.candidateUserId,
        payload.candidateName,
        payload.email,
        payload.phone,
        payload.message,
        null,
        payload.status,
        payload.recruiterNote
      ]
    );
    return;
  }

  await run(
    `UPDATE applications
     SET candidate_user_id = ?,
         candidate_name = ?,
         phone = ?,
         message = ?,
         status = ?,
         recruiter_note = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      payload.candidateUserId,
      payload.candidateName,
      payload.phone,
      payload.message,
      payload.status,
      payload.recruiterNote,
      existing.id
    ]
  );
}

const adminUserId = await ensureUser({
  email: "admin@test.com",
  password: "Password123!",
  role: "admin",
  fullName: "Alice Admin",
  phone: "0600000001",
  bio: "Admin principal de la plateforme Jobboard MVC."
});

const recruiterUserId = await ensureUser({
  email: "recruiter@test.com",
  password: "Password123!",
  role: "recruiter",
  fullName: "Romain Recruiter",
  phone: "0600000002",
  bio: "Talent acquisition manager spécialisé profils tech."
});

const candidateUserId = await ensureUser({
  email: "candidate@test.com",
  password: "Password123!",
  role: "candidate",
  fullName: "Camille Candidate",
  phone: "0600000003",
  bio: "Développeuse fullstack JS orientée produit."
});

const companyId = await ensureCompany({
  userId: recruiterUserId,
  name: "Jobboard Studio",
  website: "https://jobboard-studio.example",
  description: "Cabinet de recrutement tech spécialisé SaaS, cybersécurité et data."
});

const jobsToSeed = [
  {
    title: "Développeur Fullstack Node.js/React",
    location: "Paris",
    contractType: "CDI",
    remote: 1,
    salaryMin: 42000,
    salaryMax: 56000,
    description: "Développement de features fullstack sur un produit SaaS B2B, revues de code et amélioration continue.",
    status: "active"
  },
  {
    title: "Backend Engineer Node.js",
    location: "Lyon",
    contractType: "CDI",
    remote: 1,
    salaryMin: 45000,
    salaryMax: 62000,
    description: "Conception d'API REST, optimisation SQL, monitoring et documentation technique.",
    status: "active"
  },
  {
    title: "Frontend React confirmé",
    location: "Nantes",
    contractType: "CDI",
    remote: 0,
    salaryMin: 40000,
    salaryMax: 54000,
    description: "Développement d'interfaces React accessibles, maintenables et testées.",
    status: "active"
  },
  {
    title: "DevOps Engineer",
    location: "Remote",
    contractType: "Freelance",
    remote: 1,
    salaryMin: 55000,
    salaryMax: 75000,
    description: "Industrialisation CI/CD, observabilité, conteneurisation et fiabilité des environnements.",
    status: "active"
  },
  {
    title: "Data Engineer",
    location: "Toulouse",
    contractType: "CDI",
    remote: 1,
    salaryMin: 48000,
    salaryMax: 65000,
    description: "Mise en place de pipelines de données robustes, qualité et gouvernance data.",
    status: "active"
  },
  {
    title: "Pentester Web",
    location: "Lille",
    contractType: "CDI",
    remote: 1,
    salaryMin: 43000,
    salaryMax: 59000,
    description: "Audits OWASP, restitution des vulnérabilités et accompagnement remédiation.",
    status: "active"
  },
  {
    title: "Product Designer",
    location: "Bordeaux",
    contractType: "CDD",
    remote: 0,
    salaryMin: 36000,
    salaryMax: 45000,
    description: "Conception UX/UI, parcours utilisateurs, prototypage et design system.",
    status: "archived"
  },
  {
    title: "QA Automation Engineer",
    location: "Montpellier",
    contractType: "CDI",
    remote: 1,
    salaryMin: 38000,
    salaryMax: 50000,
    description: "Automatisation des tests e2e, stratégie qualité et non-régression continue.",
    status: "active"
  }
];

const jobIdsByTitle = {};
for (const job of jobsToSeed) {
  const id = await ensureJob(companyId, job);
  jobIdsByTitle[job.title] = id;
}

const applicationsToSeed = [
  {
    jobTitle: "Développeur Fullstack Node.js/React",
    candidateUserId,
    candidateName: "Camille Candidate",
    email: "candidate@test.com",
    phone: "0600000003",
    message: "Je souhaite contribuer à un produit SaaS avec une stack JS moderne.",
    status: "new",
    recruiterNote: "Premier entretien planifié."
  },
  {
    jobTitle: "Développeur Fullstack Node.js/React",
    candidateUserId: null,
    candidateName: "Alex Martin",
    email: "alex.martin@test.com",
    phone: "0600000004",
    message: "7 ans d'expérience React et Node en startup.",
    status: "reviewed",
    recruiterNote: "Profil solide, test technique envoyé."
  },
  {
    jobTitle: "Backend Engineer Node.js",
    candidateUserId: null,
    candidateName: "Sarah Nguyen",
    email: "sarah.nguyen@test.com",
    phone: "0600000005",
    message: "Spécialisée en API haute disponibilité et SQL.",
    status: "accepted",
    recruiterNote: "Validation finale OK."
  },
  {
    jobTitle: "Frontend React confirmé",
    candidateUserId: null,
    candidateName: "Nicolas Petit",
    email: "nicolas.petit@test.com",
    phone: "0600000006",
    message: "Je peux prendre en charge l'accessibilité et les tests front.",
    status: "rejected",
    recruiterNote: "Expérience produit insuffisante pour ce poste."
  },
  {
    jobTitle: "DevOps Engineer",
    candidateUserId: null,
    candidateName: "Fatou Diallo",
    email: "fatou.diallo@test.com",
    phone: "0600000007",
    message: "Expertise Kubernetes, Terraform et CI/CD GitHub Actions.",
    status: "reviewed",
    recruiterNote: "Échange technique à programmer."
  },
  {
    jobTitle: "Data Engineer",
    candidateUserId: null,
    candidateName: "Yann Leclerc",
    email: "yann.leclerc@test.com",
    phone: "0600000008",
    message: "Expérience BigQuery/Airflow, orienté qualité de données.",
    status: "new",
    recruiterNote: "CV intéressant, à contacter."
  },
  {
    jobTitle: "Pentester Web",
    candidateUserId: null,
    candidateName: "Ines Rahmani",
    email: "ines.rahmani@test.com",
    phone: "0600000009",
    message: "OSCP, pentests web/mobiles et accompagnement remédiation.",
    status: "accepted",
    recruiterNote: "Entretien client validé."
  },
  {
    jobTitle: "QA Automation Engineer",
    candidateUserId: null,
    candidateName: "Thomas Leroy",
    email: "thomas.leroy@test.com",
    phone: "0600000010",
    message: "Mise en place de suites Cypress et Playwright en production.",
    status: "rejected",
    recruiterNote: "Compétences API trop limitées."
  }
];

for (const application of applicationsToSeed) {
  const jobId = jobIdsByTitle[application.jobTitle];
  if (!jobId) continue;

  await ensureApplication({
    jobId,
    candidateUserId: application.candidateUserId,
    candidateName: application.candidateName,
    email: application.email,
    phone: application.phone,
    message: application.message,
    status: application.status,
    recruiterNote: application.recruiterNote
  });
}

const totals = {
  users: (await all(`SELECT id FROM users`)).length,
  companies: (await all(`SELECT id FROM companies`)).length,
  jobs: (await all(`SELECT id FROM jobs`)).length,
  applications: (await all(`SELECT id FROM applications`)).length
};

console.log("Seed OK");
console.log(`Users: ${totals.users} | Companies: ${totals.companies} | Jobs: ${totals.jobs} | Applications: ${totals.applications}`);
console.log("Compte admin: admin@test.com / Password123!");
console.log("Compte recruiter: recruiter@test.com / Password123!");
console.log("Compte candidate: candidate@test.com / Password123!");

process.exit(0);
