// Step 5h: tooling tidy-up.
//
//   node step5h-tooling-tidy.mjs --dry
//   node step5h-tooling-tidy.mjs
//
// 1. package.json   : name -> tokyo-station-guide, adds check / types / db:* / admin:hash scripts
// 2. README.md      : real project README (replaces the Astro starter text)
// 3. .env.example   : no unused variables
// 4. scripts/       : create-admin-hash.mjs moves here (src/ is for the app only)
// 5. src/scripts/common/auto-search.ts : moved next to the other shared scripts, imports fixed
// 6. login.astro / logout.astro : drop the two `await`s that do nothing
// 7. start-tunnel.bat : no hard-coded D:\ path
// 8. db/seed/admin.example.sql : placeholder only (see the warning at the end)
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
if (!fs.existsSync("package.json") || !fs.existsSync("src/pages/admin")) {
  console.error("Run from the project root.");
  process.exit(1);
}

const log = [];
const warn = [];
const writes = new Map(); // file -> text (LF) ; crlf decided per file
const crlfOf = new Map();
const moves = [];

function read(file) {
  if (writes.has(file)) return writes.get(file);
  const raw = fs.readFileSync(file, "utf8");
  crlfOf.set(file, raw.includes("\r\n"));
  const t = raw.replace(/\r\n/g, "\n");
  writes.set(file, t);
  return t;
}
const set = (file, text, crlf) => { if (crlf !== undefined) crlfOf.set(file, crlf); writes.set(file, text); };
const projectCrlf = fs.readFileSync("package.json", "utf8").includes("\r\n");

/* 1. package.json ------------------------------------------------------------ */
{
  const pkg = JSON.parse(read("package.json"));
  const before = JSON.stringify(pkg);
  pkg.name = "tokyo-station-guide";
  const DB = "tokyo-station-guide-db";
  pkg.scripts = {
    dev: "astro dev",
    build: "astro build",
    preview: "astro preview",
    astro: "astro",
    check: "astro check",
    types: "wrangler types",
    "db:migrate:local": `wrangler d1 migrations apply ${DB} --local`,
    "db:migrate:remote": `wrangler d1 migrations apply ${DB} --remote`,
    "db:seed:local": [
      `wrangler d1 execute ${DB} --local --file=db/seed/seed-core.sql`,
      `wrangler d1 execute ${DB} --local --file=db/seed/seed-details.sql`,
      `wrangler d1 execute ${DB} --local --file=db/seed/seed-featured.sql`,
    ].join(" && "),
    "db:reset:local": `wrangler d1 execute ${DB} --local --file=db/seed/reset.sql`,
    "admin:hash": "node scripts/create-admin-hash.mjs",
  };
  if (JSON.stringify(pkg) !== before) { set("package.json", JSON.stringify(pkg, null, 2) + "\n"); log.push("package.json: name + scripts"); }
}

if (fs.existsSync("package-lock.json")) {
  const lock = JSON.parse(read("package-lock.json"));
  if (lock.name !== "tokyo-station-guide") {
    lock.name = "tokyo-station-guide";
    if (lock.packages && lock.packages[""]) lock.packages[""].name = "tokyo-station-guide";
    set("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
    log.push("package-lock.json: name");
  }
}

/* 2. README ------------------------------------------------------------------ */
const README = `# Tokyo Station Guide

Interactive Tokyo train map with a station guide, plus an admin area to manage the data.

- **Website** (\`/\`): loop-map home page, station board, station sheet, search.
- **Admin** (\`/admin\`): operators, lines (and the stations on each line), stations (facilities, top picks), featured stations.

## Stack

Astro (server output) on Cloudflare Workers, D1 (SQLite) for data, a KV \`SESSION\` binding for admin sessions.

## Commands

| Command | What it does |
| :-- | :-- |
| \`npm run dev\` | Dev server at http://localhost:4321 |
| \`npm run build\` | Production build into \`dist/\` |
| \`npm run preview\` | Preview the build locally |
| \`npm run check\` | Type-check (\`astro check\`), run it before every commit |
| \`npm run types\` | Regenerate \`worker-configuration.d.ts\` from \`wrangler.jsonc\` |
| \`npm run db:migrate:local\` / \`db:migrate:remote\` | Apply \`db/migrations\` to the local / production D1 |
| \`npm run db:seed:local\` | Load the test data (\`db/seed/seed-*.sql\`) into the local D1 |
| \`npm run db:reset:local\` | Delete all content rows from the local D1 (keeps tables and admin users) |
| \`npm run admin:hash -- "Password"\` | Print a password hash for an admin user |

## First-time setup

\`\`\`sh
npm install
npm run db:migrate:local
npm run db:seed:local
\`\`\`

Create the first admin user:

1. \`npm run admin:hash -- "YourPassword"\` prints a hash.
2. Copy \`db/seed/admin.example.sql\` to \`db/seed/admin.local.sql\` (git-ignored) and put your email and the hash in it.
3. \`npx wrangler d1 execute tokyo-station-guide-db --local --file=db/seed/admin.local.sql\`
   (use \`--remote\` for production).

Never commit real emails or password hashes.

## Project structure

\`\`\`text
src/
  pages/            routes: markup only, no business logic
    admin/          admin pages (operators, lines, stations, featured-stations, auth)
  layouts/          BaseLayout, WebsiteLayout, AdminLayout
  components/
    common/         shared UI (Button, Alert, EmptyState, Breadcrumbs, ConfirmDialog, Pagination, SearchInput)
    admin/          admin-only components (AdminNavigation, StationTopPicks)
  lib/
    db/             SQL only: one file (or folder) per table group
    services/       what a page does: read the form, validate, save, redirect
    validators/     pure validation functions
    auth/           password hashing, session helpers
  scripts/          browser code, imported by pages and components
    admin/          admin pages (+ admin/shared)
    website/        home page (+ website/home)
    common/         used by both
  styles/           admin/, website/, common/
  config/           site constants
db/
  migrations/       schema (applied by wrangler)
  seed/             test data, reset, admin template
scripts/            command-line tools (not part of the app)
\`\`\`

## Where does new code go?

- A page only holds markup and one call to a service. If a page needs a \`try/catch\` or an \`if\` about the form, it belongs in \`lib/services\`.
- SQL lives in \`lib/db\`, and only there. Services call it, pages never do.
- A form rule (length, format) goes in \`lib/validators\`.
- Markup used on two or more pages becomes a component in \`components/common\`.
- Browser JavaScript goes in \`src/scripts/...\` and is imported with a normal \`<script>import "..."</script>\`, never inline.

## Notes

- \`start-tunnel.bat\` starts the dev server and a Cloudflare quick tunnel (needs \`cloudflared\`).
- Images are in \`public/images\`.
`;
set("README.md", README, projectCrlf);
log.push("README.md rewritten");

/* 3. .env.example ------------------------------------------------------------ */
if (fs.existsSync(".env.example")) {
  const used = ["PUBLIC_SITE_NAME", "PUBLIC_SITE_URL"].filter((k) => {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    return walk("src").some((f) => /\.(astro|ts|js|mjs)$/.test(f) && fs.readFileSync(f, "utf8").includes(k));
  });
  if (!used.length) {
    set(".env.example", "# No environment variables are needed.\n# Bindings (DB, SESSION) are configured in wrangler.jsonc.\n", projectCrlf);
    log.push(".env.example: removed the unused PUBLIC_SITE_NAME / PUBLIC_SITE_URL");
  } else warn.push(`.env.example left alone: ${used.join(", ")} is used in src/`);
}

/* 4 + 5. moves --------------------------------------------------------------- */
if (fs.existsSync("src/scripts/create-admin-hash.mjs") && !fs.existsSync("scripts/create-admin-hash.mjs")) {
  moves.push(["src/scripts/create-admin-hash.mjs", "scripts/create-admin-hash.mjs"]);
  log.push("src/scripts/create-admin-hash.mjs -> scripts/create-admin-hash.mjs");
}
if (fs.existsSync("src/scripts/auto-search.ts") && !fs.existsSync("src/scripts/common/auto-search.ts")) {
  moves.push(["src/scripts/auto-search.ts", "src/scripts/common/auto-search.ts"]);
  // importers: "../auto-search" (from src/scripts/admin/*.ts) -> "../common/auto-search"
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.posix.join(d, e.name)) : [path.posix.join(d, e.name)]));
  let n = 0;
  for (const f of walk("src").filter((p) => /\.(astro|ts|js|mjs)$/.test(p))) {
    const t = read(f);
    const re = /(from\s+|import\s+)(["'])((?:\.{1,2}\/)+)auto-search(\.ts)?\2/g;
    const out = t.replace(re, (m, kw, q, rel, ext) => {
      const abs = path.posix.normalize(path.posix.join(path.posix.dirname(f), rel + "auto-search"));
      if (abs !== "src/scripts/auto-search") return m;
      let r = path.posix.relative(path.posix.dirname(f), "src/scripts/common/auto-search");
      if (!r.startsWith(".")) r = "./" + r;
      n++;
      return `${kw}${q}${r}${ext ?? ""}${q}`;
    });
    if (out !== t) set(f, out);
  }
  log.push(`src/scripts/auto-search.ts -> src/scripts/common/auto-search.ts (${n} imports updated)`);
  // its own relative imports would break when it moves
  const own = read("src/scripts/auto-search.ts");
  if (/from\s+["']\.{1,2}\//.test(own)) warn.push("auto-search.ts has relative imports: check them after the move");
}

/* 6. useless awaits ---------------------------------------------------------- */
for (const [f, from, to] of [
  ["src/pages/admin/auth/login.astro", 'await Astro.session?.set("admin", {', 'Astro.session?.set("admin", {'],
  ["src/pages/admin/auth/logout.astro", "await Astro.session?.destroy();", "Astro.session?.destroy();"],
]) {
  if (!fs.existsSync(f)) continue;
  const t = read(f);
  if (t.includes(from)) { set(f, t.replace(from, to)); log.push(`${f}: removed the useless await`); }
}

/* 7. start-tunnel.bat -------------------------------------------------------- */
if (fs.existsSync("start-tunnel.bat")) {
  const t = read("start-tunnel.bat");
  const from = 'cmd /k "cd /d D:\\tokyo-station-guide && npm run dev"';
  if (t.includes(from) && /^title [^\n]*\n/m.test(t)) {
    set("start-tunnel.bat", t.replace(from, 'cmd /k "npm run dev"').replace(/^(title [^\n]*\n)/m, '$1cd /d "%~dp0"\n'));
    log.push("start-tunnel.bat: runs from its own folder instead of D:\\tokyo-station-guide");
  }
}

/* 8. admin.example.sql ------------------------------------------------------- */
if (fs.existsSync("db/seed/admin.example.sql")) {
  const t = read("db/seed/admin.example.sql");
  if (!t.includes("PASTE_HASH_HERE")) {
    const real = /INSERT INTO admin_users[\s\S]*?VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'/i.exec(t);
    set("db/seed/admin.example.sql", `-- TEMPLATE. Do not put real values in this file.
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
`, projectCrlf);
    log.push("db/seed/admin.example.sql: placeholder only");
    if (real && real[1] !== "admin@example.com") warn.push(`db/seed/admin.example.sql contained a real admin email (${real[1]}) and a password hash. It is removed from this file, but it is still in the git history of every branch you pushed. Change that admin's password (see the message from Claude).`);
  }
}

/* output --------------------------------------------------------------------- */
console.log(DRY ? "Plan (dry run):" : "Tidying:");
for (const l of log) console.log(`  ${l}`);
for (const w of warn) console.log(`\n  WARNING: ${w}`);
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

const eol = (t, crlf) => (crlf ? t.replace(/\n/g, "\r\n") : t);
for (const [f, t] of writes) {
  if (moves.some(([from]) => from === f)) continue; // written at the new path below
  fs.writeFileSync(f, eol(t, crlfOf.get(f) ?? projectCrlf), "utf8");
}
for (const [from, to] of moves) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}
console.log("\nDone. Next: npm install (only if you want a fresh lockfile name), npm run check && npm run build");