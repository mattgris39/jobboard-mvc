import { run, all, get } from "../db/db.js";

export async function hasExistingApplication({ jobId, email }) {
  const row = await get(
    `SELECT id FROM applications WHERE job_id = ? AND email = ? LIMIT 1`,
    [jobId, email]
  );

  return Boolean(row);
}

export async function createApplication({
  jobId,
  candidateUserId = null,
  candidateName,
  email,
  phone,
  message,
  cvPath
}) {
  return run(
    `INSERT INTO applications (
      job_id,
      candidate_user_id,
      candidate_name,
      email,
      phone,
      message,
      cv_path,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [jobId, candidateUserId, candidateName, email, phone, message, cvPath, "new"]
  );
}

export async function getAllApplications() {
  return all(
    `SELECT
      applications.*,
      jobs.title AS job_title,
      companies.name AS company_name
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    ORDER BY applications.id DESC`
  );
}

export async function getApplicationById(id) {
  return get(
    `SELECT
      applications.*,
      jobs.title AS job_title,
      jobs.location AS job_location,
      jobs.contract_type AS job_contract_type,
      jobs.remote AS job_remote,
      jobs.salary_min AS job_salary_min,
      jobs.salary_max AS job_salary_max,
      jobs.description AS job_description,
      companies.name AS company_name,
      companies.website AS company_website,
      companies.description AS company_description
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    WHERE applications.id = ?`,
    [id]
  );
}

export async function updateApplicationStatus(id, status) {
  return run(
    `UPDATE applications
     SET status = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [status, id]
  );
}

export async function updateApplicationAdminById(id, { status, recruiterNote }) {
  return run(
    `UPDATE applications
     SET status = ?,
         recruiter_note = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [status, recruiterNote, id]
  );
}

export async function deleteApplicationById(id) {
  return run(`DELETE FROM applications WHERE id = ?`, [id]);
}

export async function countRecruiterApplications({ userId, status = "all", q = "" } = {}) {
  const filters = ["companies.user_id = ?"];
  const params = [userId];

  if (status !== "all") {
    filters.push("applications.status = ?");
    params.push(status);
  }

  if (q.trim()) {
    filters.push("(applications.candidate_name LIKE ? OR applications.email LIKE ? OR jobs.title LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  const row = await get(
    `SELECT COUNT(*) AS total
     FROM applications
     JOIN jobs ON jobs.id = applications.job_id
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}`,
    params
  );

  return row?.total || 0;
}

export async function getApplicationsByRecruiterUserId({
  userId,
  status = "all",
  q = "",
  page = 1,
  pageSize = 10
} = {}) {
  const filters = ["companies.user_id = ?"];
  const params = [userId];

  if (status !== "all") {
    filters.push("applications.status = ?");
    params.push(status);
  }

  if (q.trim()) {
    filters.push("(applications.candidate_name LIKE ? OR applications.email LIKE ? OR jobs.title LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  params.push(pageSize, (page - 1) * pageSize);

  return all(
    `SELECT
      applications.*,
      jobs.title AS job_title,
      jobs.location AS job_location,
      jobs.contract_type AS job_contract_type,
      jobs.remote AS job_remote,
      jobs.salary_min AS job_salary_min,
      jobs.salary_max AS job_salary_max,
      companies.name AS company_name
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    WHERE ${filters.join(" AND ")}
    ORDER BY applications.id DESC
    LIMIT ? OFFSET ?`,
    params
  );
}

export async function getRecruiterApplicationById(applicationId, userId) {
  return get(
    `SELECT
      applications.*,
      jobs.title AS job_title,
      jobs.location AS job_location,
      jobs.contract_type AS job_contract_type,
      jobs.remote AS job_remote,
      jobs.salary_min AS job_salary_min,
      jobs.salary_max AS job_salary_max,
      jobs.description AS job_description,
      companies.name AS company_name,
      companies.website AS company_website,
      companies.description AS company_description
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    WHERE applications.id = ?
      AND companies.user_id = ?`,
    [applicationId, userId]
  );
}

export async function updateRecruiterApplicationStatus(applicationId, userId, status, recruiterNote = null) {
  return run(
    `UPDATE applications
     SET status = ?,
         recruiter_note = ?,
         updated_at = datetime('now')
     WHERE id = ?
       AND job_id IN (
         SELECT jobs.id
         FROM jobs
         JOIN companies ON companies.id = jobs.company_id
         WHERE companies.user_id = ?
       )`,
    [status, recruiterNote, applicationId, userId]
  );
}

export async function countCandidateApplications({ userId } = {}) {
  const row = await get(
    `SELECT COUNT(*) AS total
     FROM applications
     WHERE candidate_user_id = ?`,
    [userId]
  );

  return row?.total || 0;
}

export async function getCandidateApplications({ userId, page = 1, pageSize = 10 } = {}) {
  return all(
    `SELECT
      applications.*,
      jobs.title AS job_title,
      jobs.location AS job_location,
      jobs.contract_type AS job_contract_type,
      jobs.remote AS job_remote,
      companies.name AS company_name
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    WHERE applications.candidate_user_id = ?
    ORDER BY applications.id DESC
    LIMIT ? OFFSET ?`,
    [userId, pageSize, (page - 1) * pageSize]
  );
}

export async function getCandidateApplicationById({ applicationId, userId }) {
  return get(
    `SELECT
      applications.*,
      jobs.title AS job_title,
      jobs.description AS job_description,
      jobs.location AS job_location,
      jobs.contract_type AS job_contract_type,
      jobs.remote AS job_remote,
      companies.name AS company_name
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    WHERE applications.id = ?
      AND applications.candidate_user_id = ?`,
    [applicationId, userId]
  );
}

export async function countAdminApplications({ q = "", status = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(applications.candidate_name LIKE ? OR applications.email LIKE ? OR jobs.title LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (status !== "all") {
    filters.push("applications.status = ?");
    params.push(status);
  }

  const row = await get(
    `SELECT COUNT(*) AS total
     FROM applications
     JOIN jobs ON jobs.id = applications.job_id
     WHERE ${filters.join(" AND ")}`,
    params
  );

  return row?.total || 0;
}

export async function getAdminApplicationsPaginated({ page = 1, pageSize = 10, q = "", status = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(applications.candidate_name LIKE ? OR applications.email LIKE ? OR jobs.title LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (status !== "all") {
    filters.push("applications.status = ?");
    params.push(status);
  }

  params.push(pageSize, (page - 1) * pageSize);

  return all(
    `SELECT applications.*, jobs.title AS job_title, companies.name AS company_name
     FROM applications
     JOIN jobs ON jobs.id = applications.job_id
     JOIN companies ON companies.id = jobs.company_id
     WHERE ${filters.join(" AND ")}
     ORDER BY applications.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
}
