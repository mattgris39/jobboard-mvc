import { all, get, run } from "../db/db.js";

export async function getLatestJobs(limit = 6) {
  return all(
    `SELECT
      jobs.id,
      jobs.title,
      jobs.location,
      jobs.contract_type,
      jobs.remote,
      jobs.salary_min,
      jobs.salary_max,
      jobs.created_at,
      companies.name AS company_name
    FROM jobs
    JOIN companies ON companies.id = jobs.company_id
    WHERE jobs.status = 'active'
    ORDER BY jobs.created_at DESC, jobs.id DESC
    LIMIT ?`,
    [limit]
  );
}

export async function getActiveJobs({ q = "", location = "" }) {
  const filters = [`jobs.status = 'active'`];
  const params = [];

  if (q?.trim()) {
    filters.push(`(jobs.title LIKE ? OR jobs.description LIKE ? OR companies.name LIKE ?)`);
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (location?.trim()) {
    filters.push(`jobs.location LIKE ?`);
    params.push(`%${location.trim()}%`);
  }

  return all(
    `SELECT
      jobs.id,
      jobs.title,
      jobs.location,
      jobs.contract_type,
      jobs.remote,
      jobs.salary_min,
      jobs.salary_max,
      jobs.created_at,
      companies.name AS company_name
    FROM jobs
    JOIN companies ON companies.id = jobs.company_id
    WHERE ${filters.join(" AND ")}
    ORDER BY jobs.created_at DESC, jobs.id DESC`,
    params
  );
}

export async function getPublicJobById(id) {
  return get(
    `SELECT
      jobs.*,
      companies.name AS company_name,
      companies.website AS company_website,
      companies.description AS company_description
    FROM jobs
    JOIN companies ON companies.id = jobs.company_id
    WHERE jobs.id = ? AND jobs.status = 'active'`,
    [id]
  );
}

export async function getJobById(id) {
  return get(
    `SELECT
      jobs.*,
      companies.name AS company_name,
      companies.website AS company_website,
      companies.description AS company_description
    FROM jobs
    JOIN companies ON companies.id = jobs.company_id
    WHERE jobs.id = ?`,
    [id]
  );
}

export async function createJob({
  companyId,
  title,
  location,
  contractType,
  remote,
  salaryMin,
  salaryMax,
  description,
  status = "active"
}) {
  return run(
    `INSERT INTO jobs (
      company_id,
      title,
      location,
      contract_type,
      remote,
      salary_min,
      salary_max,
      description,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      title,
      location,
      contractType,
      remote,
      salaryMin || null,
      salaryMax || null,
      description,
      status
    ]
  );
}