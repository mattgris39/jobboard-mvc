import { run, all, get } from "../db/db.js";

export async function createApplication({
  jobId,
  candidateName,
  email,
  phone,
  message,
  cvPath
}) {
  return run(
    `INSERT INTO applications (
      job_id,
      candidate_name,
      email,
      phone,
      message,
      cv_path,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      candidateName,
      email,
      phone,
      message,
      cvPath,
      "new"
    ]
  );
}

export async function getAllApplications() {
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
     SET status = ?
     WHERE id = ?`,
    [status, id]
  );
}