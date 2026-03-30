import { randomUUID } from "node:crypto";

export async function createEmployeeSession(pool, userId, hours) {
  const token = randomUUID();
  const query = `
    insert into app_sessions (session_token, role, user_id, expires_at)
    values ($1, 'employee', $2, now() + ($3 || ' hours')::interval)
    returning session_token, role, expires_at
  `;

  const { rows } = await pool.query(query, [token, userId, String(hours)]);
  return rows[0];
}

export async function createAdminSession(pool, adminUsername, hours) {
  const token = randomUUID();
  const query = `
    insert into app_sessions (session_token, role, admin_username, expires_at)
    values ($1, 'admin', $2, now() + ($3 || ' hours')::interval)
    returning session_token, role, admin_username, expires_at
  `;

  const { rows } = await pool.query(query, [token, adminUsername, String(hours)]);
  return rows[0];
}

export async function findSessionByToken(pool, token) {
  const query = `
    select
      s.id,
      s.session_token,
      s.role,
      s.user_id,
      s.admin_username,
      s.expires_at,
      u.external_auth_id as employee_id
    from app_sessions s
    left join app_users u on u.id = s.user_id
    where s.session_token = $1
      and s.expires_at > now()
  `;

  const { rows } = await pool.query(query, [token]);
  return rows[0] || null;
}

export async function deleteSessionByToken(pool, token) {
  await pool.query("delete from app_sessions where session_token = $1", [token]);
}
