-- Failed admin login attempts, used to throttle brute-force guessing.
CREATE TABLE login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip TEXT NOT NULL,
    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email
ON login_attempts(email, attempted_at);

CREATE INDEX idx_login_attempts_ip
ON login_attempts(ip, attempted_at);
