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
    WHERE jobs.status = 'active' AND companies.is_active = 1
    ORDER BY jobs.created_at DESC, jobs.id DESC
    LIMIT ?`,
    [limit]
  );
}

export async function countActiveJobs({ q = "", location = "", contractType = "", remote = "all" } = {}) {
  const filters = ["jobs.status = 'active'", "companies.is_active = 1"];
  const params = [];

  if (q.trim()) {
    filters.push("(jobs.title LIKE ? OR jobs.description LIKE ? OR companies.name LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (location.trim()) {
    filters.push("jobs.location LIKE ?");
    params.push(`%${location.trim()}%`);
  }

  if (contractType.trim()) {
    filters.push("jobs.contract_type = ?");
    params.push(contractType.trim());
  }

  if (remote !== "all") {
    filters.push("jobs.remote = ?");
    params.push(remote === "1" ? 1 : 0);
  }

  const row = await get(
    `SELECT COUNT(*) AS total
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}`,
    params
  );

  return row?.total || 0;
}

export async function getActiveJobsPaginated({
  page = 1,
  pageSize = 10,
  q = "",
  location = "",
  contractType = "",
  remote = "all",
  sort = "recent"
} = {}) {
  const filters = ["jobs.status = 'active'", "companies.is_active = 1"];
  const params = [];

  if (q.trim()) {
    filters.push("(jobs.title LIKE ? OR jobs.description LIKE ? OR companies.name LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (location.trim()) {
    filters.push("jobs.location LIKE ?");
    params.push(`%${location.trim()}%`);
  }

  if (contractType.trim()) {
    filters.push("jobs.contract_type = ?");
    params.push(contractType.trim());
  }

  if (remote !== "all") {
    filters.push("jobs.remote = ?");
    params.push(remote === "1" ? 1 : 0);
  }

  const orderBy = sort === "oldest" ? "jobs.created_at ASC, jobs.id ASC" : "jobs.created_at DESC, jobs.id DESC";

  params.push(pageSize, (page - 1) * pageSize);

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
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`,
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
    WHERE jobs.id = ? AND jobs.status = 'active' AND companies.is_active = 1`,
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

export async function archiveJobById(jobId, userId) {
  return run(
    `UPDATE jobs
     SET status = 'archived',
         updated_at = datetime('now')
     WHERE id = ?
       AND company_id IN (
         SELECT id
         FROM companies
         WHERE user_id = ?
       )`,
    [jobId, userId]
  );
}

export async function reactivateJobById(jobId, userId) {
  return run(
    `UPDATE jobs
     SET status = 'active',
         updated_at = datetime('now')
     WHERE id = ?
       AND company_id IN (
         SELECT id
         FROM companies
         WHERE user_id = ?
       )`,
    [jobId, userId]
  );
}

export async function getCompanyByUserId(userId) {
  return get(
    `SELECT *
     FROM companies
     WHERE user_id = ?`,
    [userId]
  );
}

export async function countRecruiterJobs({ userId, status = "all", q = "" } = {}) {
  const filters = ["companies.user_id = ?"];
  const params = [userId];

  if (status !== "all") {
    filters.push("jobs.status = ?");
    params.push(status);
  }

  if (q.trim()) {
    filters.push("(jobs.title LIKE ? OR jobs.location LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  const row = await get(
    `SELECT COUNT(*) AS total
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}`,
    params
  );

  return row?.total || 0;
}

export async function getJobsByRecruiterUserId({ userId, status = "all", q = "", page = 1, pageSize = 10 } = {}) {
  const filters = ["companies.user_id = ?"];
  const params = [userId];

  if (status !== "all") {
    filters.push("jobs.status = ?");
    params.push(status);
  }

  if (q.trim()) {
    filters.push("(jobs.title LIKE ? OR jobs.location LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  params.push(pageSize, (page - 1) * pageSize);

  return all(
    `SELECT
      jobs.*,
      companies.name AS company_name
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}
     ORDER BY jobs.created_at DESC, jobs.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

export async function getJobStatsByRecruiterUserId(userId) {
  const jobs = await all(
    `SELECT jobs.status
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE companies.user_id = ?`,
    [userId]
  );

  return {
    total: jobs.length,
    active: jobs.filter((job) => job.status === "active").length,
    archived: jobs.filter((job) => job.status === "archived").length
  };
}

export async function getRecruiterJobById(jobId, userId) {
  return get(
    `SELECT
      jobs.*,
      companies.name AS company_name
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE jobs.id = ?
       AND companies.user_id = ?`,
    [jobId, userId]
  );
}

export async function updateJobById(jobId, userId, payload) {
  return run(
    `UPDATE jobs
     SET title = ?,
         location = ?,
         contract_type = ?,
         remote = ?,
         salary_min = ?,
         salary_max = ?,
         description = ?,
         updated_at = datetime('now')
     WHERE id = ?
       AND company_id IN (
         SELECT id
         FROM companies
         WHERE user_id = ?
       )`,
    [
      payload.title,
      payload.location,
      payload.contractType,
      payload.remote,
      payload.salaryMin || null,
      payload.salaryMax || null,
      payload.description,
      jobId,
      userId
    ]
  );
}

export async function countAdminJobs({ q = "", status = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(jobs.title LIKE ? OR companies.name LIKE ? OR jobs.location LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (status !== "all") {
    filters.push("jobs.status = ?");
    params.push(status);
  }

  const row = await get(
    `SELECT COUNT(*) AS total
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}`,
    params
  );

  return row?.total || 0;
}

export async function getAdminJobsPaginated({ page = 1, pageSize = 10, q = "", status = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(jobs.title LIKE ? OR companies.name LIKE ? OR jobs.location LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (status !== "all") {
    filters.push("jobs.status = ?");
    params.push(status);
  }

  params.push(pageSize, (page - 1) * pageSize);

  return all(
    `SELECT jobs.*, companies.name AS company_name
     FROM jobs
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}
     ORDER BY jobs.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

export async function updateJobAdminById(id, payload) {
  return run(
    `UPDATE jobs
     SET company_id = ?,
         title = ?,
         location = ?,
         contract_type = ?,
         remote = ?,
         salary_min = ?,
         salary_max = ?,
         description = ?,
         status = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      payload.companyId,
      payload.title,
      payload.location,
      payload.contractType,
      payload.remote,
      payload.salaryMin || null,
      payload.salaryMax || null,
      payload.description,
      payload.status,
      id
    ]
  );
}

export async function deleteJobById(id) {
  return run(`DELETE FROM jobs WHERE id = ?`, [id]);
}

export async function toggleJobStatusById(id) {
  return run(
    `UPDATE jobs
     SET status = CASE WHEN status = 'active' THEN 'archived' ELSE 'active' END,
         updated_at = datetime('now')
     WHERE id = ?`,
    [id]
  );
}
