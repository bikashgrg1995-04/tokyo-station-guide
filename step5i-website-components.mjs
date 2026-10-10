// Step 5i: website home page -> components in src/components/website/
//
//   node step5i-website-components.mjs --dry
//   node step5i-website-components.mjs
//
// src/pages/index.astro (325 lines) keeps the data loading and one line per part:
//   <Topbar />  <TransitMap />  <StationBoard />  <LinesDialog />
//   <StationSheet />  <SearchOverlay />  <HomeData />
// The markup is moved as-is (only de-indented). CSS imports and the
// <script> import stay in the page, so the CSS order does not change.
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const PAGE = "src/pages/index.astro";
const OUT = "src/components/website";

if (!fs.existsSync(PAGE)) { console.error(`${PAGE} not found. Run from the project root.`); process.exit(1); }
if (fs.existsSync(OUT)) { console.error(`${OUT} already exists (already done?)`); process.exit(1); }

const raw = fs.readFileSync(PAGE, "utf8");
const crlf = raw.includes("\r\n");
const text = raw.replace(/\r\n/g, "\n");

// frontmatter / template split
const fmEnd = text.indexOf("\n---\n", 4);
const front = text.slice(0, fmEnd + 5);
let tpl = text.slice(fmEnd + 5);

const open = /^\s*<WebsiteLayout\b[^]*?\n>\n/.exec(tpl);
const closeIdx = tpl.lastIndexOf("</WebsiteLayout>");
if (!open || closeIdx < 0) { console.error("Could not find <WebsiteLayout> ... </WebsiteLayout>"); process.exit(1); }
const before = tpl.slice(0, open[0].length);
const inner = tpl.slice(open[0].length, closeIdx);
const after = tpl.slice(closeIdx);

/* where each part starts (4 spaces of indent inside WebsiteLayout) */
const PARTS = [
  { name: "Topbar", re: /^    <header class="topbar">/m, tag: '<Topbar siteName={siteName} />', props: "siteName" },
  { name: "TransitMap", re: /^    <main class="stage" id="stage">/m, tag: "<TransitMap />" },
  { name: "StationBoard", re: /^    <section class="board"/m, tag: "<StationBoard />" },
  { name: "LinesDialog", re: /^    <div\n      class="lines-dialog"/m, tag: "<LinesDialog />" },
  { name: "StationSheet", re: /^    <div class="station-sheet" id="station-sheet"/m, tag: "<StationSheet />" },
  { name: "SearchOverlay", re: /^    <div class="search-overlay" id="search-overlay"/m, tag: "<SearchOverlay />" },
  { name: "HomeData", re: /^    <script\n      type="application\/json"\n      id="transit-data"/m, tag: "<HomeData transitData={transitData} searchable={searchable} featuredStations={featuredStations} />", props: "data" },
];
const END = /^    <script>\n      import "[^"]*website\/home\.js";\n    <\/script>/m;

const found = PARTS.map((p) => ({ ...p, at: p.re.exec(inner)?.index ?? -1 }));
const bad = found.filter((p) => p.at < 0).map((p) => p.name);
const endM = END.exec(inner);
if (bad.length || !endM) { console.error(`Could not find: ${[...bad, ...(endM ? [] : ["the home.js <script>"])].join(", ")}\n(the page may have been edited since I wrote this step)`); process.exit(1); }
for (let i = 1; i < found.length; i++) if (found[i].at <= found[i - 1].at) { console.error("Parts are not in the expected order"); process.exit(1); }
if (endM.index <= found.at(-1).at) { console.error("home.js <script> is not at the end"); process.exit(1); }

const dedent = (s) => s.split("\n").map((l) => (l.startsWith("    ") ? l.slice(4) : l)).join("\n");

const components = [];
let newInner = inner.slice(0, found[0].at);
found.forEach((p, i) => {
  const end = i + 1 < found.length ? found[i + 1].at : endM.index;
  const block = inner.slice(p.at, end).replace(/\s+$/, "");
  const head =
    p.props === "siteName"
      ? "---\nexport interface Props {\n  siteName: string;\n}\n\nconst { siteName } = Astro.props;\n---\n\n"
      : p.props === "data"
        ? "---\nexport interface Props {\n  transitData: unknown;\n  searchable: unknown;\n  featuredStations: unknown;\n}\n\nconst { transitData, searchable, featuredStations } = Astro.props;\n---\n\n"
        : "";
  components.push({ name: p.name, src: head + dedent(block) + "\n", lines: block.split("\n").length });
  newInner += `    ${p.tag}\n\n`;
});
newInner += inner.slice(endM.index);

// imports go below the existing ones
const importLines = components.map((c) => `import ${c.name} from "../components/website/${c.name}.astro";`).join("\n") + "\n";
const anchor = front.match(/^import WebsiteLayout from [^\n]*\n/m);
if (!anchor) { console.error("Could not find the WebsiteLayout import"); process.exit(1); }
const newFront = front.replace(anchor[0], anchor[0] + importLines);
const newPage = newFront + before + newInner + after;

console.log(DRY ? "Plan (dry run):" : "Extracting:");
console.log(`  ${PAGE}: ${text.split("\n").length} -> ${newPage.split("\n").length} lines`);
for (const c of components) console.log(`    ${OUT}/${c.name}.astro  (${c.lines} lines)`);
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

const eol = (t) => (crlf ? t.replace(/\n/g, "\r\n") : t);
fs.mkdirSync(OUT, { recursive: true });
for (const c of components) fs.writeFileSync(`${OUT}/${c.name}.astro`, eol(c.src), "utf8");
fs.writeFileSync(PAGE, eol(newPage), "utf8");
console.log("\nDone. Next: npm run check && npm run build && npm run dev (open the home page)");