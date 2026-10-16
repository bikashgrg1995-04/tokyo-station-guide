# Database schema (Cloudflare D1 / SQLite)

Single source of truth for what each table is for and which code owns it.
The SQL itself lives in `db/migrations/` (applied in numeric order).

## Tables

| Table | Purpose | Owned by (`src/lib/…`) |
|---|---|---|
| `operators` | Railway companies (JR East, Tokyo Metro, …) | `db/operators.ts` |
| `lines` | Train lines, belong to one operator | `db/lines.ts` |
| `stations` | Stations (name, JP name, map location link, about, verification with a manually picked date) | `db/stations/*` |
| `line_stations` | Which station is on which line, in order, with station code | `db/line-stations.ts` |
| `facilities` | Shared list of facility types (icon + dark icon in R2) | `db/facilities.ts` |
| `station_floors` | Floors of a station | `db/station-floors.ts` |
| `station_floor_facilities` | Facility on a floor (count, note, order, inside/outside location) | write: `db/stations/write.ts`, read: `db/stations/relations.ts`, `db/transit-map.ts` |
| `station_exits` | Exits of a station, tied to a floor | `db/station-exits.ts` |
| `station_floor_facility_exits` | Which exits a floor facility is reached from | `db/stations/write.ts` |
| `station_platforms` | Platforms (optional line + floor, destinations) | `db/station-platforms.ts` |
| `top_picks` | Shared list of nearby attractions | `db/top-picks.ts` |
| `station_top_picks` | Which pick is recommended at which station | `db/top-picks.ts`, `db/stations/write.ts` |
| `featured_stations` | Home page "Popular Station Hubs" | `db/featured-stations.ts` |
| `station_suggestions` | Visitor message about a station (and the line they were viewing); the admin reads it and edits the station by hand. Status: pending = New, approved = Resolved, rejected = Dismissed. | `db/station-suggestions.ts` |
| `admin_users` | Admin accounts (PBKDF2 hash) | `pages/admin/auth/login.astro` |
| `login_attempts` | Failed logins for throttling (purged after 1 day) | `auth/login-throttle.ts` |

Removed in 0014/0015: `station_floor_top_picks` (never used), `station_facilities`
(legacy, replaced by floors in 0011).

## Relationships

```
operators 1─* lines 1─* line_stations *─1 stations
stations 1─* station_floors 1─* station_floor_facilities *─1 facilities
                    │                       └─* station_floor_facility_exits *─1 station_exits
                    ├─* station_exits (floor_id)
                    └─* station_platforms (floor_id, optional)
stations *─* top_picks via station_top_picks
stations 1─1 featured_stations      stations 1─* station_suggestions
```

Delete rules: deleting a station cascades to all its rows in the tables above;
deleting an operator is blocked while it has lines (`RESTRICT`);
deleting a line sets `station_platforms.line_id` to NULL.

## Conventions

- Timestamps are `TEXT` (`CURRENT_TIMESTAMP`, UTC). Booleans are `INTEGER` 0/1.
- Every FK has an index that starts with the FK column (a UNIQUE that starts with it counts).
- Facility icons are R2 object keys (`facilities.icon`, `icon_dark`). `top_picks.image_url` (an R2 key `top-pick-images/...` when uploaded, or an older URL) and
  `featured_stations.image_url` hold a URL or a `public/` path.
- SQL belongs in `src/lib/db/`. Four files still run it directly (see open items).

## Changing the schema

1. Add a new `db/migrations/NNNN_name.sql`. Never edit one that has been applied.
2. Additive first: add the column/table, ship code that uses it, then clean up.
3. Dropping something: remove all code that touches it and deploy that first,
   then add the `DROP` as its own migration. Back up D1 before applying remotely.
4. Update this file and `db/seed/` (seeds must fill the live tables, `reset.sql` must list every table).
5. Test the full chain on an empty DB (`npm run db:migrate:local && npm run db:seed:local`).

## Known open items

- `lines.show_on_map` exists and is seeded, but no code reads or writes it. The 0001 comment
  says it controls map/dialog visibility. Either wire it up or drop the column.
- `station_exits.station_id` duplicates what `floor_id` already implies. Nothing prevents an
  exit pointing at a floor of another station.
- SQL outside `src/lib/db/`: `pages/admin/index.astro` (dashboard counts), `pages/admin/auth/login.astro`,
  `pages/api/admin/station-suggestions/[id].ts`, `lib/auth/login-throttle.ts`.
