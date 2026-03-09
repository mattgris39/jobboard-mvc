import { all, get, run } from "../db/db.js";

export async function getUserByEmail(email) {
  return get(
    `SELECT id, email, password_hash, role, full_name, phone, bio, is_active, created_at, updated_at
     FROM users
     WHERE email = ?`,
    [email]
  );
}

export async function getUserById(id) {
  return get(
    `SELECT id, email, role, full_name, phone, bio, is_active, created_at, updated_at
     FROM users
     WHERE id = ?`,
    [id]
  );
}

export async function createUser({ email, passwordHash, role, fullName = null, phone = null, bio = null }) {
  return run(
    `INSERT INTO users (email, password_hash, role, full_name, phone, bio)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, role, fullName, phone, bio]
  );
}

export async function updateUserProfileById(id, { fullName, phone, bio }) {
  return run(
    `UPDATE users
     SET full_name = ?,
         phone = ?,
         bio = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [fullName, phone, bio, id]
  );
}

export async function updateUserPasswordById(id, passwordHash) {
  return run(
    `UPDATE users
     SET password_hash = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [passwordHash, id]
  );
}

export async function getUserRoleStats() {
  const rows = await all(
    `SELECT role, COUNT(*) as total
     FROM users
     GROUP BY role`
  );

  return rows.reduce(
    (acc, row) => {
      acc[row.role] = row.total;
      return acc;
    },
    { candidate: 0, recruiter: 0, admin: 0 }
  );
}

export async function getRecentUsers(limit = 10) {
  return all(
    `SELECT id, email, role, full_name, is_active, created_at
     FROM users
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );
}

export async function countUsers({ q = "", role = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(email LIKE ? OR full_name LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (role !== "all") {
    filters.push("role = ?");
    params.push(role);
  }

  const row = await get(`SELECT COUNT(*) AS total FROM users WHERE ${filters.join(" AND ")}`, params);
  return row?.total || 0;
}

export async function getUsersPaginated({ page = 1, pageSize = 10, q = "", role = "all" } = {}) {
  const filters = ["1=1"];
  const params = [];

  if (q.trim()) {
    filters.push("(email LIKE ? OR full_name LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (role !== "all") {
    filters.push("role = ?");
    params.push(role);
  }

  params.push(pageSize, (page - 1) * pageSize);

  return all(
    `SELECT id, email, role, full_name, phone, bio, is_active, created_at, updated_at
     FROM users
     WHERE ${filters.join(" AND ")}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

export async function updateUserAdminById(id, { email, role, fullName, phone, bio, isActive }) {
  return run(
    `UPDATE users
     SET email = ?,
         role = ?,
         full_name = ?,
         phone = ?,
         bio = ?,
         is_active = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [email, role, fullName, phone, bio, isActive, id]
  );
}

export async function deleteUserById(id) {
  return run(`DELETE FROM users WHERE id = ?`, [id]);
}
