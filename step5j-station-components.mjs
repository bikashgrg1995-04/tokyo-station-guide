// Step 5j: the two station pages share their markup.
//
//   node step5j-station-components.mjs --dry
//   node step5j-station-components.mjs
//
// New components (src/components/admin/):
//   StationFormFields.astro  name, Japanese name, slug, latitude, longitude, description, about
//   FacilityModal.astro      the "Add Facilities" dialog
// stations/new.astro and stations/[id]/edit.astro use them. The markup comes
// from the "new" page (it has the placeholders and the error ids); the edit
// page gets those too.
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const NEW = "src/pages/admin/stations/new.astro";
const EDIT = "src/pages/admin/stations/[id]/edit.astro";
const OUT = "src/components/admin";

for (const f of [NEW, EDIT]) if (!fs.existsSync(f)) { console.error(`${f} not found. Run from the project root.`); process.exit(1); }
for (const c of ["StationFormFields", "FacilityModal"])
  if (fs.existsSync(`${OUT}/${c}.astro`)) { console.error(`${OUT}/${c}.astro already exists (already done?)`); process.exit(1); }
if (!fs.existsSync(`${OUT}/StationTopPicks.astro`)) { console.error(`${OUT}/StationTopPicks.astro not found (run steps 5a-5c first)`); process.exit(1); }

/* ------------------------------------------------------------------ helpers */
function load(file) {
  const raw = fs.readFileSync(file, "utf8");
  return { crlf: raw.includes("\r\n"), text: raw.replace(/\r\n/g, "\n") };
}
function divEnd(text, start) {
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(text))) {
    if (m[0] === "</div>") { if (--depth === 0) return m.index + m[0].length; }
    else depth++;
  }
  throw new Error("unbalanced <div>");
}
function dedent(block) {
  const lines = block.split("\n");
  const k = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(Math.min(k, l.match(/^ */)[0].length))).join("\n");
}
function indentOf(text, idx) {
  return text.slice(text.lastIndexOf("\n", idx - 1) + 1, idx);
}
const relTo = (file, target) => {
  let r = path.posix.relative(path.posix.dirname(file), target);
  if (!r.startsWith(".")) r = "./" + r;
  return r;
};

/** Cuts `<div ...>` blocks that start at `startRe` out of `text`. */
function findBlock(text, startRe, what) {
  const m = startRe.exec(text);
  if (!m) throw new Error(`could not find ${what}`);
  const start = m.index;
  const end = divEnd(text, start);
  return { start, end, code: text.slice(start, end) };
}

const FIELDS_RE = /<div class="admin-form-grid">/;
const MODAL_RE = /<div\s+id="add-facility-modal"/;

const newPage = load(NEW);
const editPage = load(EDIT);

/* --------------------------------------------------- StationFormFields (from new) */
const nf = findBlock(newPage.text, FIELDS_RE, `the form grid in ${NEW}`);
const fieldsBody = dedent(nf.code);
const FIELDS_SRC = `---
import type { StationFormErrors, StationFormValues } from "../../lib/validators/station";

export interface Props {
  values: StationFormValues;
  errors: StationFormErrors;
}

const { values, errors } = Astro.props;

const {
  name,
  nameJapanese,
  slug,
  latitude: latitudeValue,
  longitude: longitudeValue,
  description,
  about,
} = values;
---

${fieldsBody}
`;

/* ------------------------------------------------------ FacilityModal (from new) */
const nm = findBlock(newPage.text, MODAL_RE, `the facility modal in ${NEW}`);
let modalBody = dedent(nm.code);

const descRe = /<p\s+id="add-facility-modal-description"\s*>[^<]*<\/p>/;
if (!descRe.test(modalBody)) throw new Error("modal: description paragraph not found");
modalBody = modalBody.replace(descRe, '<p id="add-facility-modal-description">{description}</p>');
const emptyRe = /description="Add facilities to the master facility list first\."/;
if (!emptyRe.test(modalBody)) throw new Error("modal: empty-state text not found");
modalBody = modalBody.replace(emptyRe, "description={emptyDescription}");

const MODAL_SRC = `---
import Button from "../common/Button.astro";
import EmptyState from "../common/EmptyState.astro";
import type { Facility } from "../../lib/db/facilities";

export interface Props {
  /** Facilities that can still be added. */
  facilities: Facility[];
  /** Text under the dialog title. */
  description: string;
  /** Text shown when there is nothing to add. */
  emptyDescription: string;
}

const { facilities, description, emptyDescription } = Astro.props;
---

${modalBody}
`;

/* ------------------------------------------------------------------ the pages */
function usedInExpression(text, name) {
  return new RegExp(`\\{[^{}]*(?<![.\\w"'-])${name}(?![\\w"'-])[^{}]*\\}`).test(text);
}

function convert(page, file, modalTag) {
  let text = page.text;

  // modal first (it is further down), then the fields
  const m = findBlock(text, MODAL_RE, `the facility modal in ${file}`);
  const mi = indentOf(text, m.start);
  text = text.slice(0, m.start) + modalTag.replace(/^/gm, (x, off) => (off === 0 ? "" : mi)) + text.slice(m.end);

  const f = findBlock(text, FIELDS_RE, `the form grid in ${file}`);
  const fi = indentOf(text, f.start);
  text = text.slice(0, f.start) + "<StationFormFields values={form.values} errors={errors} />" + text.slice(f.end);

  // imports
  const front = text.indexOf("\n---\n", 4);
  let head = text.slice(0, front + 5), body = text.slice(front + 5);
  const add = ["StationFormFields", "FacilityModal"].map((c) => `import ${c} from "${relTo(file, `${OUT}/${c}.astro`)}";\n`).join("");
  const anchor = /^import StationTopPicks from [^\n]*\n/m.exec(head);
  if (!anchor) throw new Error(`${file}: could not find the StationTopPicks import`);
  head = head.replace(anchor[0], add + anchor[0]);

  // imports that are not used any more
  for (const c of ["EmptyState", "Button"]) {
    if (new RegExp(`import ${c} from`).test(head) && !new RegExp(`<${c}\\b`).test(body)) {
      head = head.replace(new RegExp(`^import ${c} from [^\\n]*\\n`, "m"), "");
    }
  }

  // form.values destructuring: keep only what the page still reads
  const dm = /const \{\n((?:  [^\n]+\n)+)\} = form\.values;\n/.exec(head);
  if (dm) {
    const kept = dm[1].split("\n").filter(Boolean).filter((l) => {
      const id = l.trim().replace(/,$/, "").split(":").pop().trim();
      return usedInExpression(body, id);
    });
    head = head.replace(dm[0], kept.length ? `const {\n${kept.join("\n")}\n} = form.values;\n` : "");
  }
  return head + body;
}

const newOut = convert(
  newPage,
  NEW,
  `<FacilityModal
  facilities={facilities}
  description="Select one or more facilities to add to this station."
  emptyDescription="Add facilities to the master facility list first."
/>`,
);
const editOut = convert(
  editPage,
  EDIT,
  `<FacilityModal
  facilities={availableFacilities}
  description={\`Select one or more facilities to add to \${station.name}.\`}
  emptyDescription="All facilities from the master list are already assigned to this station."
/>`,
);

/* ------------------------------------------------------------------- output */
console.log(DRY ? "Plan (dry run):" : "Sharing station markup:");
console.log(`  create ${OUT}/StationFormFields.astro  (${FIELDS_SRC.split("\n").length} lines)`);
console.log(`  create ${OUT}/FacilityModal.astro      (${MODAL_SRC.split("\n").length} lines)`);
console.log(`  ${NEW}: ${newPage.text.split("\n").length} -> ${newOut.split("\n").length} lines`);
console.log(`  ${EDIT}: ${editPage.text.split("\n").length} -> ${editOut.split("\n").length} lines`);
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

const eol = (t, crlf) => (crlf ? t.replace(/\n/g, "\r\n") : t);
fs.writeFileSync(`${OUT}/StationFormFields.astro`, eol(FIELDS_SRC, newPage.crlf), "utf8");
fs.writeFileSync(`${OUT}/FacilityModal.astro`, eol(MODAL_SRC, newPage.crlf), "utf8");
fs.writeFileSync(NEW, eol(newOut, newPage.crlf), "utf8");
fs.writeFileSync(EDIT, eol(editOut, editPage.crlf), "utf8");
console.log("\nDone. Next: npm run check && npm run build && npm run dev (open Add Station and Edit Station)");