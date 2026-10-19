export type AdminUserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  is_active: number;
};

export async function getAdminUserByEmail(
  db: D1Database,
  email: string,
): Promise<AdminUserRow | null> {
  return db
    .prepare(
      `
        SELECT id, email, name, password_hash, is_active
        FROM admin_users
        WHERE email = ?
        LIMIT 1
      `,
    )
    .bind(email)
    .first<AdminUserRow>();
}
