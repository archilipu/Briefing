export async function findEmployeeByExternalId(pool, employeeId) {
  const query = `
    select id, external_auth_id, display_name, is_active
    from app_users
    where role = 'employee'
      and external_auth_id = $1
    limit 1
  `;

  const { rows } = await pool.query(query, [employeeId]);
  return rows[0] || null;
}

export async function listEmployees(pool) {
  const query = `
    select id, external_auth_id, display_name, is_active, created_at
    from app_users
    where role = 'employee'
    order by external_auth_id asc
  `;

  const { rows } = await pool.query(query);
  return rows;
}

export async function createEmployee(pool, employeeId) {
  const query = `
    insert into app_users (role, external_auth_id, display_name, is_active)
    values ('employee', $1, $1, true)
    on conflict (external_auth_id)
    do update set is_active = true
    returning id, external_auth_id, display_name, is_active, created_at
  `;

  const { rows } = await pool.query(query, [employeeId]);
  return rows[0];
}

export async function deactivateEmployee(pool, employeeId) {
  const query = `
    update app_users
       set is_active = false
     where role = 'employee'
       and external_auth_id = $1
     returning id, external_auth_id, display_name, is_active, created_at
  `;

  const { rows } = await pool.query(query, [employeeId]);
  return rows[0] || null;
}
