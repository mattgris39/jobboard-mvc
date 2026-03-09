import { all, get } from "../db/db.js";

export async function getAdminGlobalStats() {
  const [usersRow, jobsRow, applicationsRow] = await Promise.all([
    get(`SELECT COUNT(*) AS total FROM users`),
    get(`SELECT COUNT(*) AS total FROM jobs`),
    get(`SELECT COUNT(*) AS total FROM applications`)
  ]);

  return {
    users: usersRow?.total || 0,
    jobs: jobsRow?.total || 0,
    applications: applicationsRow?.total || 0
  };
}

export async function getApplicationStatusStats() {
  const rows = await all(
    `SELECT status, COUNT(*) AS total
     FROM applications
     GROUP BY status`
  );

  return rows.reduce(
    (acc, row) => {
      acc[row.status] = row.total;
      return acc;
    },
    { new: 0, reviewed: 0, accepted: 0, rejected: 0 }
  );
}
