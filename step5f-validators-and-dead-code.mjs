// Step 5f: validators in their own files + remove code nobody calls.
//
//   node step5f-validators-and-dead-code.mjs --dry
//   node step5f-validators-and-dead-code.mjs
//
// 1. src/lib/validators/{operator,line,featured-station,station}.ts
//    The form types, the empty-errors helper and the validate*Form function
//    move out of src/lib/services/* (pure functions, easy to test).
// 2. Deletes DB functions with no callers:
//      facilities.ts : addFacilityToStation, removeFacilityFromStation, addFacilitiesToStation
//      top-picks.ts  : addTopPickToStation, removeTopPickFromStation
//      stations.ts   : linesToJson, validateLineList, splitLines
//    (the slug getters stay: the website detail pages will need them)
// 3. Removes the unused `facilitySlug` parameter in facility-picker.ts.
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
if (!fs.existsSync("src/lib/services/common.ts")) {
  console.error("Run from the project root, after steps 5a-5e (src/lib/services/common.ts not found).");
  process.exit(1);
}

const files = new Map(); // path -> {text, crlf}
function load(file) {
  if (!files.has(file)) {
    const raw = fs.readFileSync(file, "utf8");
    files.set(file, { text: raw.replace(/\r\n/g, "\n"), crlf: raw.includes("\r\n"), isNew: false });
  }
  return files.get(file);
}
const log = [];
const crlfProject = fs.readFileSync("src/lib/services/common.ts", "utf8").includes("\r\n");

/* ------------------------------------------------------------ source scanner */
function matchClose(src, openIdx) {
  const open = src[openIdx], close = open === "(" ? ")" : "}";
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = src.indexOf("*/", i) + 1; continue; }
    if (c === '"' || c === "'") { for (i++; src[i] !== c; i++) if (src[i] === "\\") i++; continue; }
    if (c === "`") {
      for (i++; src[i] !== "`"; i++) {
        if (src[i] === "\\") i++;
        else if (src[i] === "$" && src[i + 1] === "{") i = matchClose(src, i + 1);
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return i;
  }
  throw new Error("unbalanced");
}

/** Finds a top-level declaration. Returns {start, end} (end exclusive) or null. */
function findDecl(text, kind, name) {
  const re = {
    interface: new RegExp(`^export interface ${name}\\b`, "m"),
    type: new RegExp(`^export type ${name}\\b`, "m"),
    fn: new RegExp(`^(?:export )?(?:async )?function ${name}\\b`, "m"),
  }[kind];
  const m = re.exec(text);
  if (!m) return null;
  let end;
  if (kind === "type") {
    end = text.indexOf(";", m.index) + 1;
  } else if (kind === "interface") {
    end = matchClose(text, text.indexOf("{", m.index)) + 1;
  } else {
    const paren = text.indexOf("(", m.index);
    const afterParams = matchClose(text, paren) + 1;
    end = matchClose(text, text.indexOf("{", afterParams)) + 1;
  }
  let start = m.index;
  // take the doc comment right above, and the banner comment above a function
  const before = text.slice(0, start);
  const ci = before.lastIndexOf("/**");
  if (ci >= 0) {
    const seg = before.slice(ci);
    if (/^\/\*\*[^]*?\*\/\n$/.test(seg) && seg.indexOf("*/") === seg.length - 3) start = ci;
  }
  return { start, end };
}

function cutDecl(w, kind, name) {
  const d = findDecl(w.text, kind, name);
  if (!d) return null;
  const code = w.text.slice(d.start, d.end);
  let after = w.text.slice(d.end).replace(/^\n+/, "\n\n");
  let before = w.text.slice(0, d.start);
  // drop a banner comment that now has nothing under it
  const bi = before.lastIndexOf("/*");
  if (kind === "fn" && bi >= 0 && /^\/\*\s*=+[^]*?\*\/\s*$/.test(before.slice(bi)) && before.slice(bi).indexOf("*/") === before.slice(bi).trimEnd().length - 2) {
    before = before.slice(0, bi);
  }
  w.text = (before + after).replace(/\n{4,}/g, "\n\n\n");
  return code;
}

/* --------------------------------------------------------------- 1. validators */
const MODULES = [
  {
    service: "src/lib/services/operators.ts",
    out: "src/lib/validators/operator.ts",
    empty: "emptyOperatorErrors",
    items: [["interface", "OperatorFormValues"], ["type", "OperatorFormErrors"], ["fn", "emptyErrors"], ["fn", "validateOperatorForm"]],
    header: "",
  },
  {
    service: "src/lib/services/lines.ts",
    out: "src/lib/validators/line.ts",
    empty: "emptyLineErrors",
    items: [["interface", "LineFormValues"], ["type", "LineFormErrors"], ["fn", "emptyErrors"], ["fn", "validateLineForm"]],
    header: 'import type { Operator } from "../db/operators";\n\n',
  },
  {
    service: "src/lib/services/featured-stations.ts",
    out: "src/lib/validators/featured-station.ts",
    empty: "emptyFeaturedStationErrors",
    items: [["interface", "FeaturedStationFormValues"], ["type", "FeaturedStationFormErrors"], ["fn", "emptyErrors"], ["fn", "validateFeaturedStationForm"]],
    header: "",
  },
  {
    service: "src/lib/services/stations.ts",
    out: "src/lib/validators/station.ts",
    empty: "emptyStationErrors",
    items: [["interface", "StationFormValues"], ["type", "StationFormErrors"], ["fn", "emptyErrors"], ["fn", "toNumberOrNull"], ["fn", "validateStationForm"]],
    header: "",
  },
];

for (const mod of MODULES) {
  if (!fs.existsSync(mod.service)) { console.error(`Not found: ${mod.service}`); process.exit(1); }
  if (fs.existsSync(mod.out)) { console.error(`${mod.out} already exists (already done?)`); process.exit(1); }
  const w = load(mod.service);
  const pieces = [];
  for (const [kind, name] of mod.items) {
    let code = cutDecl(w, kind, name);
    if (!code) throw new Error(`${mod.service}: ${name} not found`);
    if (!code.startsWith("export ")) code = "export " + code;
    pieces.push(code);
  }
  // rename emptyErrors everywhere
  const rename = (s) => s.replace(/\bemptyErrors\b/g, mod.empty);
  const body = pieces.map(rename).join("\n\n") + "\n";
  w.text = rename(w.text);

  // imports for the service
  const used = [];
  for (const [kind, name0] of mod.items) {
    const name = name0 === "emptyErrors" ? mod.empty : name0;
    if (new RegExp(`\\b${name}\\b`).test(w.text)) used.push(kind === "interface" || kind === "type" ? `type ${name}` : name);
  }
  const rel = "../validators/" + path.posix.basename(mod.out, ".ts");
  const imp = `import {\n${used.map((u) => `  ${u},`).join("\n")}\n} from "${rel}";\n`;
  w.text = w.text.replace(/^const LIST_PATH/m, `${imp}\nconst LIST_PATH`);

  // lines: Operator type may not be needed in the service any more
  if (mod.service.endsWith("lines.ts")) {
    const uses = (w.text.match(/\bOperator\b/g) || []).length;
    if (uses === 1) w.text = w.text.replace(/^import type \{ Operator \} from "\.\.\/db\/operators";\n/m, "");
  }

  files.set(mod.out, { text: mod.header + body, crlf: crlfProject, isNew: true });
  log.push(`created ${mod.out}  (${mod.items.map((i) => i[1]).join(", ")})`);
}

/* ------------------------------------------------------------ 2. dead DB code */
const DEAD = [
  ["src/lib/db/facilities.ts", ["addFacilityToStation", "removeFacilityFromStation", "addFacilitiesToStation"]],
  ["src/lib/db/top-picks.ts", ["addTopPickToStation", "removeTopPickFromStation"]],
  ["src/lib/db/stations.ts", ["linesToJson", "validateLineList", "splitLines"]],
];
const allSrc = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.posix.join(dir, e.name);
  return e.isDirectory() ? allSrc(p) : /\.(astro|ts|js|mjs)$/.test(p) ? [p] : [];
});
const sources = allSrc("src");
for (const [file, names] of DEAD) {
  const w = load(file);
  for (const name of names) {
    const re = new RegExp(`\\b${name}\\b`);
    const elsewhere = sources.some((s) => s !== file && re.test(fs.readFileSync(s, "utf8")));
    if (elsewhere) { log.push(`SKIP ${name}: used in another file`); continue; }
    // other declarations of the same file may still call it (splitLines is used by the two others)
    const own = (w.text.match(new RegExp(`\\b${name}\\b`, "g")) || []).length;
    const d = findDecl(w.text, "fn", name);
    if (!d) { log.push(`SKIP ${name}: not found (already removed?)`); continue; }
    const insideSelf = (w.text.slice(d.start, d.end).match(new RegExp(`\\b${name}\\b`, "g")) || []).length;
    if (own - insideSelf > 0) { log.push(`SKIP ${name}: still called inside ${file}`); continue; }
    cutDecl(w, "fn", name);
    log.push(`removed ${name}() from ${file}`);
  }
}

/* ------------------------------------------------- 3. facilitySlug parameter */
{
  const f = "src/scripts/admin/shared/facility-picker.ts";
  if (fs.existsSync(f)) {
    const w = load(f);
    const sig = "    facilityName: string,\n    facilitySlug: string,\n  ): void {";
    const decl = '      const facilitySlug = checkbox.dataset.facilitySlug ?? "";\n';
    const call = "addFacilityToTable(facilityId, facilityName, facilitySlug);";
    const calls = (w.text.match(/addFacilityToTable\(/g) || []).length;
    if (w.text.includes(sig) && w.text.includes(decl) && w.text.includes(call) && calls === 2) {
      w.text = w.text.replace(sig, "    facilityName: string,\n  ): void {").replace(decl, "").replace(call, "addFacilityToTable(facilityId, facilityName);");
      log.push(`removed unused facilitySlug parameter in ${f}`);
    } else log.push(`SKIP facilitySlug: code differs from what I expected in ${f}`);
  }
}

/* ------------------------------------------------------------------- output */
console.log(DRY ? "Plan (dry run):" : "Refactoring:");
for (const l of log) console.log(`  ${l}`);
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

const eol = (t, crlf) => (crlf ? t.replace(/\n/g, "\r\n") : t);
fs.mkdirSync("src/lib/validators", { recursive: true });
for (const [f, w] of files) fs.writeFileSync(f, eol(w.text, w.crlf), "utf8");
console.log("\nDone. Next: npm run astro check && npm run build");