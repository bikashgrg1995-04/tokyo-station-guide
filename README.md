# Tokyo Station Guide

Interactive Tokyo train map with a station guide, plus an admin area to manage the data.

- **Website** (`/`): loop-map home page, station board, station sheet, search.
- **Admin** (`/admin`): operators, lines (and the stations on each line), stations (facilities, top picks), featured stations.

## Stack

Astro (server output) on Cloudflare Workers, D1 (SQLite) for data, a KV `SESSION` binding for admin sessions.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the build locally |
| `npm run check` | Type-check (`astro check`), run it before every commit |
| `npm run types` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npm run db:migrate:local` / `db:migrate:remote` | Apply `db/migrations` to the local / production D1 |
| `npm run db:seed:local` | Load the test data (`db/seed/seed-*.sql`) into the local D1 |
| `npm run db:reset:local` | Delete all content rows from the local D1 (keeps tables and admin users) |
| `npm run admin:hash -- "Password"` | Print a password hash for an admin user |

## First-time setup

```sh
npm install
npm run db:migrate:local
npm run db:seed:local
```

Create the first admin user:

1. `npm run admin:hash -- "YourPassword"` prints a hash.
2. Copy `db/seed/admin.example.sql` to `db/seed/admin.local.sql` (git-ignored) and put your email and the hash in it.
3. `npx wrangler d1 execute tokyo-station-guide-db --local --file=db/seed/admin.local.sql`
   (use `--remote` for production).

Never commit real emails or password hashes.

## Project structure

```text
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
```

## Where does new code go?

- A page only holds markup and one call to a service. If a page needs a `try/catch` or an `if` about the form, it belongs in `lib/services`.
- SQL lives in `lib/db`, and only there. Services call it, pages never do.
- A form rule (length, format) goes in `lib/validators`.
- Markup used on two or more pages becomes a component in `components/common`.
- Browser JavaScript goes in `src/scripts/...` and is imported with a normal `<script>import "..."</script>`, never inline.

## Notes

- `start-tunnel.bat` starts the dev server and a Cloudflare quick tunnel (needs `cloudflared`).
- Images are in `public/images`.
