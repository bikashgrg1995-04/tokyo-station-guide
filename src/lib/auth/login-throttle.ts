/** Throttles admin login: too many failures for one email or one IP lock it for a while. */

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

/** Best-effort client IP (Cloudflare sets CF-Connecting-IP). */
export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

async function countFailures(
  db: D1Database,
  column: "email" | "ip",
  value: string,
): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM login_attempts
        WHERE ${column} = ?
          AND attempted_at >= datetime('now', ?)
      `,
    )
    .bind(value, `-${WINDOW_MINUTES} minutes`)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

/** True when this email or IP has failed too often in the last 15 minutes. */
export async function isLoginBlocked(
  db: D1Database,
  email: string,
  ip: string,
): Promise<boolean> {
  const [byEmail, byIp] = await Promise.all([
    countFailures(db, "email", email),
    countFailures(db, "ip", ip),
  ]);

  return byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP;
}

/** Records a failed attempt and drops attempts older than a day. */
export async function recordFailedLogin(
  db: D1Database,
  email: string,
  ip: string,
): Promise<void> {
  await db.batch([
    db
      .prepare("INSERT INTO login_attempts (email, ip) VALUES (?, ?)")
      .bind(email, ip),
    db.prepare(
      "DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-1 day')",
    ),
  ]);
}

/** Clears the failures of an email after a successful login. */
export async function clearFailedLogins(
  db: D1Database,
  email: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM login_attempts WHERE email = ?")
    .bind(email)
    .run();
}
