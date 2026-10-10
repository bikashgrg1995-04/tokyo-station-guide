// Step 5g: split src/lib/db/stations.ts (984 lines) into a folder.
//
//   node step5g-split-stations-db.mjs --dry
//   node step5g-split-stations-db.mjs
//
//   src/lib/db/stations/types.ts      all interfaces
//   src/lib/db/stations/relations.ts  facility / top pick / connection helpers
//   src/lib/db/stations/read.ts       getStationBySlug, getStations, getStationById,
//                                     getAdminStationsPaginated
//   src/lib/db/stations/search.ts     searchStations
//   src/lib/db/stations/write.ts      createStation, updateStation, deleteStation
//   src/lib/db/stations/index.ts      re-exports, so `lib/db/stations` imports keep working
//
// Code is moved as-is. Nothing else in the project needs to change.
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const SRC = "src/lib/db/stations.ts";
const DIR = "src/lib/db/stations";

if (!fs.existsSync(SRC)) {
  console.error(`${SRC} not found (already split?). Run from the project root, after step 5f.`);
  process.exit(1);
}
if (fs.existsSync(DIR)) { console.error(`${DIR} already exists`); process.exit(1); }

const raw = fs.readFileSync(SRC, "utf8");
const crlf = raw.includes("\r\n");
const text = raw.replace(/\r\n/g, "\n");

/* -------------------------------------------------------------- where it goes */
const PLAN = {
  types: ["StationLine", "Station", "StationListItem", "StationSearchResult", "StationAdminListItem", "StationEditItem", "CreateStationInput", "UpdateStationInput", "PaginatedStations"],
  relations: ["getStationFacilitiesJson", "getStationTopPicksJson", "getStationConnectionsJson", "parseStringListJson", "resolveFacilityIds", "resolveTopPickIds"],
  read: ["getStationBySlug", "getStations", "getStationById", "getAdminStationsPaginated"],
  search: ["searchStations"],
  write: ["createStation", "updateStation", "deleteStation"],
};
const TITLES = {
  types: "Station types",
  relations: "Station relations (facilities, top picks, connections)",
  read: "Read stations",
  search: "Search stations",
  write: "Create, update and delete stations",
};
const target = new Map();
for (const [file, names] of Object.entries(PLAN)) for (const n of names) target.set(n, file);

/* ---------------------------------------------------------------- the scanner */
// every top-level declaration start
const DECL = /^(?:export )?(?:async )?(?:function|interface|type|const|let|class)\s+([A-Za-z0-9_]+)/gm;
const decls = [];
for (let m; (m = DECL.exec(text)); ) decls.push({ name: m[1], index: m.index });

const unknown = decls.filter((d) => !target.has(d.name)).map((d) => d.name);
if (unknown.length) { console.error(`Not in the plan: ${unknown.join(", ")}`); process.exit(1); }
const missing = [...target.keys()].filter((n) => !decls.some((d) => d.name === n));
if (missing.length) { console.error(`Planned but not found: ${missing.join(", ")}`); process.exit(1); }

// include the comment blocks right above a declaration
function leadStart(idx) {
  let start = idx;
  for (;;) {
    const before = text.slice(0, start);
    const trimmed = before.replace(/\s+$/, "");
    if (!trimmed.endsWith("*/")) break;
    const ci = trimmed.lastIndexOf("/*");
    const seg = trimmed.slice(ci);
    if (seg.indexOf("*/") !== seg.length - 2) break;
    if ((before.slice(trimmed.length).match(/\n/g) || []).length > 2) break;
    start = ci;
  }
  return start;
}

const starts = decls.map((d) => ({ ...d, start: leadStart(d.index) }));
const segments = starts.map((d, i) => ({
  name: d.name,
  code: text.slice(d.start, i + 1 < starts.length ? starts[i + 1].start : text.length),
}));
const preamble = text.slice(0, starts[0].start);

// nothing may get lost
if (preamble + segments.map((s) => s.code).join("") !== text) throw new Error("internal check failed: segments do not cover the file");
if (preamble.trim() && !/^\/\*[^]*?\*\/\s*$/.test(preamble.trim())) throw new Error("unexpected code before the first declaration");

/* ---------------------------------------------------------------- build files */
const names = new Set(target.keys());
const files = {};
for (const file of Object.keys(PLAN)) {
  const mine = segments.filter((s) => target.get(s.name) === file);
  let body = mine.map((s) => s.code.trim()).join("\n\n");

  if (file === "relations") {
    // these helpers are used by read.ts / write.ts now
    body = body.replace(/^(async )?function /gm, "export $1function ");
    body = body.replace(/^\/\* =+\n\s+Internal Relation Helpers\n=+ \*\/\n*/, "");
  }

  // imports from the sibling files (comments do not count as a use)
  const codeOnly = body.replace(/\/\*[^]*?\*\/|\/\/[^\n]*/g, "");
  const imports = [];
  for (const other of Object.keys(PLAN)) {
    if (other === file) continue;
    const used = PLAN[other].filter((n) => new RegExp(`\\b${n}\\b`).test(codeOnly));
    if (!used.length) continue;
    if (other === "types") imports.push(`import type {\n${used.map((u) => `  ${u},`).join("\n")}\n} from "./types";`);
    else imports.push(`import {\n${used.map((u) => `  ${u},`).join("\n")}\n} from "./${other}";`);
  }

  const header = `/* ========================================\n   ${TITLES[file]}\n======================================== */\n\n`;
  files[file] = header + (imports.length ? imports.join("\n") + "\n\n" : "") + body.replace(/^\/\* =+\n\s+Stations Database Helpers\n=+ \*\/\n*/, "") + "\n";
}
files.index = `export * from "./types";\nexport * from "./read";\nexport * from "./search";\nexport * from "./write";\n`;

/* --------------------------------------------------------------------- output */
console.log(DRY ? "Plan (dry run):" : "Splitting:");
console.log(`  ${SRC}  (${text.split("\n").length} lines)  ->  ${DIR}/`);
for (const [f, c] of Object.entries(files)) console.log(`    ${f}.ts  ${c.split("\n").length} lines`);
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

const eol = (t) => (crlf ? t.replace(/\n/g, "\r\n") : t);
fs.mkdirSync(DIR, { recursive: true });
for (const [f, c] of Object.entries(files)) fs.writeFileSync(`${DIR}/${f}.ts`, eol(c), "utf8");
fs.unlinkSync(SRC);
console.log("\nDone. Next: npm run astro check && npm run build");