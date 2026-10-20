/**
 * Minimal .xlsx reader for the browser (no library).
 * An .xlsx file is a zip of XML files: this reads the sheet names and the
 * cell text of each sheet. Formulas are read as their last saved value.
 */

export type SheetRows = Record<string, string[][]>;

const textDecoder = new TextDecoder("utf-8");

interface ZipEntry {
  method: number;
  compressedSize: number;
  offset: number;
}

function readZipIndex(view: DataView): Map<string, ZipEntry> {
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This is not an Excel (.xlsx) file.");

  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();

  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const offset = view.getUint32(pos + 42, true);
    const name = textDecoder.decode(
      new Uint8Array(view.buffer, view.byteOffset + pos + 46, nameLength),
    );
    entries.set(name, { method, compressedSize, offset });
    pos += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read Excel files. Please update it.");
  }
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(
  buffer: ArrayBuffer,
  view: DataView,
  entry: ZipEntry,
): Promise<string> {
  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLength + extraLength;
  const raw = new Uint8Array(buffer, start, entry.compressedSize);

  if (entry.method === 0) return textDecoder.decode(raw);
  if (entry.method === 8) return textDecoder.decode(await inflate(raw));
  throw new Error("Unsupported Excel file.");
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Could not read the Excel file.");
  return doc;
}

/** Text of a shared string / inline string, without phonetic (furigana) runs. */
function stringItemText(item: Element): string {
  let out = "";
  item.querySelectorAll("t").forEach((t) => {
    if (!t.closest("rPh")) out += t.textContent ?? "";
  });
  return out;
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

export async function readXlsx(file: File): Promise<SheetRows> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const entries = readZipIndex(view);

  const read = async (name: string) => {
    const entry = entries.get(name);
    return entry ? readEntry(buffer, view, entry) : null;
  };

  const workbookXml = await read("xl/workbook.xml");
  const relsXml = await read("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relsXml) throw new Error("This is not an Excel (.xlsx) file.");

  const targets = new Map<string, string>();
  parseXml(relsXml)
    .querySelectorAll("Relationship")
    .forEach((rel) => {
      targets.set(rel.getAttribute("Id") ?? "", rel.getAttribute("Target") ?? "");
    });

  const sharedXml = await read("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    parseXml(sharedXml)
      .querySelectorAll("sst > si")
      .forEach((si) => shared.push(stringItemText(si)));
  }

  const result: SheetRows = {};
  const sheetNodes = Array.from(parseXml(workbookXml).querySelectorAll("sheets > sheet"));

  for (const node of sheetNodes) {
    const name = node.getAttribute("name") ?? "";
    const relId =
      node.getAttribute("r:id") ??
      node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ??
      "";
    let target = targets.get(relId) ?? "";
    target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;

    const sheetXml = await read(target);
    if (!sheetXml) continue;

    const rows: string[][] = [];

    parseXml(sheetXml)
      .querySelectorAll("sheetData > row")
      .forEach((rowNode) => {
        const rowIndex = Number(rowNode.getAttribute("r")) - 1;
        const cells: string[] = [];

        rowNode.querySelectorAll(":scope > c").forEach((cell) => {
          const col = columnIndex(cell.getAttribute("r") ?? "");
          const type = cell.getAttribute("t");
          let value = "";

          if (type === "inlineStr") {
            const is = cell.querySelector("is");
            value = is ? stringItemText(is) : "";
          } else {
            const v = cell.querySelector("v")?.textContent ?? "";
            if (type === "s") value = shared[Number(v)] ?? "";
            else if (type === "b") value = v === "1" ? "1" : "0";
            else value = v;
          }

          if (col >= 0) cells[col] = value;
        });

        if (rowIndex >= 0) rows[rowIndex] = Array.from(cells, (c) => c ?? "");
      });

    // Fill gaps so every row exists, and drop trailing empty rows.
    const filled = Array.from(rows, (r) => r ?? []);
    while (filled.length && filled[filled.length - 1].every((c) => (c ?? "") === "")) {
      filled.pop();
    }
    result[name] = filled;
  }

  return result;
}
