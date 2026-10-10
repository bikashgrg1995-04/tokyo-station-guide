// Step 5l: website CSS imports move from the home page into WebsiteLayout,
//          and one unused stylesheet is deleted.
//
//   node step5l-website-css.mjs --dry
//   node step5l-website-css.mjs
//
// 1. src/pages/index.astro       loses its 10 `import "../styles/website/*.css"` lines
//    src/layouts/WebsiteLayout.astro gets the same lines, in the SAME order
//    (the path is the same too: pages/ and layouts/ are both one level below src/)
//    -> the page is markup + data only, and any future website page gets the styles.
// 2. src/styles/admin/search-input.css is deleted: nothing imports it
//    (the real one is src/styles/common/search-input.css, used by SearchInput.astro).
//
// The admin pages keep their CSS imports on purpose: forms.css, tables.css, stations.css,
// lines.css and operators.css repeat some selectors (e.g. .admin-list-toolbar,
// .admin-line-station-modal*), so loading them all everywhere, or in another order,
// could change how pages look. That needs its own CSS cleanup step.
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const PAGE = "src/pages/index.astro";
const LAYOUT = "src/layouts/WebsiteLayout.astro";
const DEAD_CSS = "src/styles/admin/search-input.css";

for (const f of [PAGE, LAYOUT]) if (!fs.existsSync(f)) { console.error(`${f} not found. Run from the project root.`); process.exit(1); }

function load(file) {
  const raw = fs.readFileSync(file, "utf8");
  return { crlf: raw.includes("\r\n"), text: raw.replace(/\r\n/g, "\n") };
}
const eol = (t, crlf) => (crlf ? t.replace(/\n/g, "\r\n") : t);

const page = load(PAGE);
const layout = load(LAYOUT);

/* ---------------------------------------------------- 1. website css -> layout */
const CSS_RE = /^import "\.\.\/styles\/website\/[^"]+\.css";\n/gm;
const imports = page.text.match(CSS_RE) || [];
if (!imports.length) { console.error(`No website CSS imports in ${PAGE} (already done?)`); process.exit(1); }
if (/styles\/website\//.test(layout.text)) { console.error(`${LAYOUT} already imports website CSS`); process.exit(1); }

const anchor = /^import BaseLayout from [^\n]*\n/m.exec(layout.text);
if (!anchor) { console.error(`${LAYOUT}: BaseLayout import not found`); process.exit(1); }

// the page: drop the lines (and the blank line they leave behind)
let newPage = page.text.replace(CSS_RE, "").replace(/\n{3,}/g, "\n\n");
const newLayout = layout.text.replace(anchor[0], anchor[0] + "\n" + imports.join(""));

/* --------------------------------------------------------- 2. unused stylesheet */
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.posix.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}
let deleteDead = false;
if (fs.existsSync(DEAD_CSS)) {
  const refs = [...walk("src")].filter((f) => f !== DEAD_CSS && /\.(astro|ts|js|mjs|css)$/.test(f) && /admin\/search-input/.test(fs.readFileSync(f, "utf8")));
  deleteDead = refs.length === 0;
  if (!deleteDead) console.log(`  SKIP ${DEAD_CSS}: used in ${refs.join(", ")}`);
}

/* ---------------------------------------------------------------------- output */
console.log(DRY ? "Plan (dry run):" : "Moving CSS imports:");
console.log(`  ${PAGE}: ${page.text.split("\n").length} -> ${newPage.split("\n").length} lines  (-${imports.length} CSS imports)`);
console.log(`  ${LAYOUT}: +${imports.length} CSS imports`);
if (deleteDead) console.log(`  delete ${DEAD_CSS}`);
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

fs.writeFileSync(PAGE, eol(newPage, page.crlf), "utf8");
fs.writeFileSync(LAYOUT, eol(newLayout, layout.crlf), "utf8");
if (deleteDead) fs.unlinkSync(DEAD_CSS);
console.log("\nDone. Next: npm run check && npm run build && npm run dev (open the home page: it must look exactly the same)");