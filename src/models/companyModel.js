import { all, get, run } from "../db/db.js";

export async function getCompanyById(id) {
  return get(
    `SELECT companies.*, users.email AS recruiter_email, users.full_name AS recruiter_name
     FROM companies
     LEFT JOIN users ON users.id = companies.user_id
     WHERE companies.id = ?`,
    [id]
  );
}

export async function getCompanyByUserId(userId) {
  return get(`SELECT * FROM companies WHERE user_id = ?`, [userId]);
}

export async function countCompanies({ q = "", active = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(companies.name LIKE ? OR companies.website LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (active !== "all") {
    filters.push("companies.is_active = ?");
    params.push(active === "1" ? 1 : 0);
  }

  const row = await get(`SELECT COUNT(*) AS total FROM companies WHERE ${filters.join(" AND ")}`, params);
  return row?.total || 0;
}

export async function getCompaniesPaginated({ page = 1, pageSize = 10, q = "", active = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(companies.name LIKE ? OR companies.website LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (active !== "all") {
    filters.push("companies.is_active = ?");
    params.push(active === "1" ? 1 : 0);
  }

  params.push(pageSize, (page - 1) * pageSize);

  return all(
    `SELECT companies.*, users.email AS recruiter_email, users.full_name AS recruiter_name
     FROM companies
     LEFT JOIN users ON users.id = companies.user_id
     WHERE ${filters.join(" AND ")}
     ORDER BY companies.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

export async function createCompany({ userId, name, website, description, logoUrl = null, isActive = 1 }) {
  return run(
    `INSERT INTO companies (user_id, name, website, description, logo_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, name, website, description, logoUrl, isActive]
  );
}

export async function updateCompanyById(id, { userId, name, website, description, logoUrl = null, isActive = 1 }) {
  return run(
    `UPDATE companies
     SET user_id = ?,
         name = ?,
         website = ?,
         description = ?,
         logo_url = ?,
         is_active = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [userId, name, website, description, logoUrl, isActive, id]
  );
}

export async function toggleCompanyActiveById(id) {
  return run(
    `UPDATE companies
     SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
         updated_at = datetime('now')
     WHERE id = ?`,
    [id]
  );
}

export async function deleteCompanyById(id) {
  return run(`DELETE FROM companies WHERE id = ?`, [id]);
}
