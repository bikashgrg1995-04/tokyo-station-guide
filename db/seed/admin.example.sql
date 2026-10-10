-- TEMPLATE. Do not put real values in this file.
--
-- 1. Copy it to db/seed/admin.local.sql (git-ignored).
-- 2. Create a hash:   npm run admin:hash -- "YourPassword"
-- 3. Put your email and the hash below, then run:
--      npx wrangler d1 execute tokyo-station-guide-db --local --file=db/seed/admin.local.sql
--    (use --remote for production)

DELETE FROM admin_users
WHERE email = 'admin@example.com';

INSERT INTO admin_users (email, password_hash, name)
VALUES ('admin@example.com', 'PASTE_HASH_HERE', 'Admin');
