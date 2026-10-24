import { FACILITY_CATEGORY_IDS } from "../facility-categories";
import {
  COMMENT_PREFIX,
  FACILITY_LOCATIONS,
  LINE_TYPES,
  MAX_ROWS_PER_SHEET,
  MAX_ROWS_TOTAL,
  REQUIRED_COLUMNS,
  SHEET_ORDER,
  TOP_PICK_CATEGORIES,
  SEASONS,
  TOP_PICK_LOCATIONS,
  WEBSITE_STATUSES,
  type ImportIssue,
  type ImportPreview,
  type RawSheets,
  type SheetName,
  type SheetSummary,
} from "../import/sheets";
import {
  KEY_FIELDS,
  NOT_NULL_FIELDS,
  type ImportOp,
  type ImportSnapshot,
  type UpsertOp,
  type Opt,
  type OpType,
} from "../import/types";

/**
 * Checks an uploaded workbook against the database and turns it into a list
 * of operations. Pure: it reads nothing and writes nothing.
 * Rule for every sheet: new key = create; same key = update, but only when a
 * value really differs (identical rows are skipped as "unchanged").
 * A column missing from the file keeps the stored value, an empty cell clears
 * it (columns that can never be empty keep their value), nothing is deleted.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ERRORS_SHOWN = 200;

export interface ImportPlan {
  preview: ImportPreview;
  ops: ImportOp[];
}

type Row = Record<string, string>;

/** Excel stores dates as a day count (1900 system). */
function excelSerialToDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}

function cleanSheetName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export interface ImportOptions {
  /**
   * Sync mode: for every sheet that has data rows, rows that are in the
   * database but not in the sheet are deleted. Sheets without data rows are left alone.
   */
  deleteMissing?: boolean;
}

export function buildImportPlan(
  raw: RawSheets,
  snap: ImportSnapshot,
  options: ImportOptions = {},
): ImportPlan {
  const errors: ImportIssue[] = [];
  const warnings: string[] = [];
  const ops: ImportOp[] = [];
  const counts = new Map<SheetName, { created: number; updated: number; unchanged: number; deleted: number }>();
  const deletions: ImportPreview["deletions"] = [];

  let totalErrors = 0;
  const fail = (sheet: string, row: number, message: string) => {
    totalErrors += 1;
    if (errors.length < MAX_ERRORS_SHOWN) {
      errors.push({ sheet, row, message });
    }
  };

  // ---- Read the rows of every known sheet --------------------------------
  const sheets = new Map<SheetName, { rowNumber: number; data: Row }[]>();
  let totalRows = 0;

  const byName = new Map<string, string[][]>();
  for (const [name, rows] of Object.entries(raw)) {
    byName.set(cleanSheetName(name), rows);
  }

  for (const name of Object.keys(raw)) {
    const clean = cleanSheetName(name);
    if (
      clean !== "readme" &&
      !SHEET_ORDER.includes(clean as SheetName)
    ) {
      warnings.push(`Sheet "${name}" is not part of the template and was ignored.`);
    }
  }

  for (const sheet of SHEET_ORDER) {
    const rows = byName.get(sheet);
    if (!rows || rows.length === 0) continue;

    const header = (rows[0] ?? []).map((h) => String(h ?? "").trim().toLowerCase());
    const missing = REQUIRED_COLUMNS[sheet].filter((c) => !header.includes(c));

    if (missing.length > 0) {
      fail(sheet, 1, `Missing column(s): ${missing.join(", ")}.`);
      continue;
    }

    const list: { rowNumber: number; data: Row }[] = [];

    for (let i = 1; i < rows.length; i += 1) {
      const cells = rows[i] ?? [];
      const values = header.map((_, c) => String(cells[c] ?? "").trim());

      if (values.every((v) => v === "")) continue;
      if (values[0].startsWith(COMMENT_PREFIX)) continue;

      const data: Row = {};
      header.forEach((h, c) => {
        if (h) data[h] = values[c];
      });
      list.push({ rowNumber: i + 1, data });
    }

    if (list.length > MAX_ROWS_PER_SHEET) {
      fail(sheet, 0, `Too many rows (${list.length}). Maximum is ${MAX_ROWS_PER_SHEET} per sheet.`);
      continue;
    }

    totalRows += list.length;
    if (list.length > 0) sheets.set(sheet, list);
  }

  if (totalRows > MAX_ROWS_TOTAL) {
    fail("-", 0, `Too many rows in total (${totalRows}). Maximum is ${MAX_ROWS_TOTAL}. Upload in smaller parts.`);
  }

  // ---- Known keys (database + earlier rows of this upload) ----------------
  const operatorSlugs = new Set(snap.operators.map((o) => o.slug));
  const operatorNames = new Map(snap.operators.map((o) => [o.name.toLowerCase(), o.slug]));
  const lineSlugs = new Set(snap.lines.map((l) => l.slug));
  const stationSlugs = new Set(snap.stations.map((s) => s.slug));
  const facilitySlugs = new Set(snap.facilities.map((f) => f.slug));
  const facilityNames = new Map(snap.facilities.map((f) => [f.name.toLowerCase(), f.slug]));
  const topPickSlugs = new Set(snap.topPicks.map((t) => t.slug));
  const floors = new Set(snap.floors);
  const exits = new Set(snap.exits);
  const platforms = new Set(snap.platforms);
  const sides = new Set(snap.sides);
  const routes = new Set(snap.routes);
  const tips = new Set(snap.tips);
  const seasons = new Set(snap.seasons);
  const floorFacilities = new Set(snap.floorFacilities);
  const stationTopPicks = new Set(snap.stationTopPicks);

  const lineOrders = new Map<string, Map<string, number>>();
  for (const ls of snap.lineStations) {
    const m = lineOrders.get(ls.lineSlug) ?? new Map<string, number>();
    m.set(ls.stationSlug, ls.order);
    lineOrders.set(ls.lineSlug, m);
  }

  const removedExits = new Set<string>();

  // ---- Sync mode: rows that the database has but a synced sheet no longer has --
  if (options.deleteMissing) {
    const fileKeys = (sheet: SheetName, keyOf: (d: Row) => string) =>
      new Set((sheets.get(sheet) ?? []).map((r) => keyOf(r.data)));
    const synced = (sheet: SheetName) => (sheets.get(sheet)?.length ?? 0) > 0;
    const gone = (type: OpType, sheet: SheetName, keyOf: (d: Row) => string, keep: (k: string, row: Record<string, string | number | null>) => boolean = () => true): Set<string> => {
      const out = new Set<string>();
      if (!synced(sheet)) return out;
      const inFile = fileKeys(sheet, keyOf);
      for (const [key, row] of Object.entries(snap.stored[type] ?? {})) {
        if (!inFile.has(key) && keep(key, row)) out.add(key);
      }
      return out;
    };
    const part = (key: string, i: number) => key.split("|")[i] ?? "";

    const delOperators = gone("operator", "operators", (d) => d.slug);
    const delLines = gone("line", "lines", (d) => d.slug);
    const delStations = gone("station", "stations", (d) => d.slug);
    // Facilities are managed in Admin > Facilities only; an import never changes or deletes them.
    const delFacilities = new Set<string>();
    const delTopPicks = gone("topPick", "top_picks", (d) => d.slug);

    const stationKept = (st: string) => !delStations.has(st);
    const delLineStations = gone("lineStation", "line_stations", (d) => `${d.line_slug}|${d.station_slug}`,
      (k) => !delLines.has(part(k, 0)) && stationKept(part(k, 1)));
    const delFloors = gone("floor", "floors", (d) => `${d.station_slug}|${d.name}`, (k) => stationKept(part(k, 0)));
    const floorKept = (st: string, floor: string) => stationKept(st) && !delFloors.has(`${st}|${floor}`);
    const delFloorFacilities = gone("floorFacility", "floor_facilities",
      (d) => `${d.station_slug}|${d.floor_name}|${d.facility_slug}`,
      (k) => floorKept(part(k, 0), part(k, 1)) && !delFacilities.has(part(k, 2)));
    const delExits = gone("exit", "exits", (d) => `${d.station_slug}|${d.name}`,
      (k, row) => floorKept(part(k, 0), String(row.floorName ?? "")));
    const delPlatforms = gone("platform", "platforms",
      (d) => `${d.station_slug}|${d.platform_number}|${d.line_slug ?? ""}`, (k) => stationKept(part(k, 0)));
    const delSides = gone("side", "sides", (d) => `${d.station_slug}|${d.name}`, (k) => stationKept(part(k, 0)));
    const delRoutes = gone("route", "routes", (d) => `${d.station_slug}|${d.from_place}|${d.route ?? ""}`, (k) => stationKept(part(k, 0)));
    const delTips = gone("tip", "tips", (d) => `${d.station_slug}|${d.tip}`, (k) => stationKept(part(k, 0)));
    const delSeasons = gone("season", "seasons", (d) => `${d.station_slug}|${(d.season ?? "").toLowerCase()}`, (k) => stationKept(part(k, 0)));
    const delStationTopPicks = gone("stationTopPick", "station_top_picks",
      (d) => `${d.station_slug}|${d.top_pick_slug}`, (k) => stationKept(part(k, 0)) && !delTopPicks.has(part(k, 1)));

    delExits.forEach((k) => removedExits.add(k));
    delStations.forEach((st) => {
      for (const e of exits) if (e.startsWith(`${st}|`)) removedExits.add(e);
    });

    // An operator cannot be deleted while a line of it stays.
    for (const op of delOperators) {
      const stays = Object.entries(snap.stored.line ?? {}).find(
        ([slug, row]) => row.operatorSlug === op && !delLines.has(slug),
      );
      if (stays) {
        fail("operators", 0, `Operator "${op}" is not in the file but its line "${stays[0]}" stays, so it cannot be deleted. Add the operator back, or include the lines sheet without that line.`);
      }
    }

    const groups: [OpType, SheetName, Set<string>][] = [
      ["station", "stations", delStations],
      ["line", "lines", delLines],
      ["operator", "operators", delOperators],
      ["topPick", "top_picks", delTopPicks],
      ["lineStation", "line_stations", delLineStations],
      ["floor", "floors", delFloors],
      ["floorFacility", "floor_facilities", delFloorFacilities],
      ["exit", "exits", delExits],
      ["platform", "platforms", delPlatforms],
      ["side", "sides", delSides],
      ["route", "routes", delRoutes],
      ["tip", "tips", delTips],
      ["season", "seasons", delSeasons],
      ["stationTopPick", "station_top_picks", delStationTopPicks],
    ];
    for (const [type, sheet, set] of groups) {
      if (set.size === 0) continue;
      const c = counts.get(sheet) ?? { created: 0, updated: 0, unchanged: 0, deleted: 0 };
      c.deleted = set.size;
      counts.set(sheet, c);
      deletions.push({ sheet, total: set.size, keys: [...set].slice(0, 15).map((k) => k.replace(/\|/g, " · ")) });
      for (const key of set) ops.push({ t: "delete", type, key });
    }
    if (delStations.size > 0) {
      warnings.push(`Deleting ${delStations.size} station(s) also removes their floors, exits, platforms, facilities, top-pick links, featured entry and suggestions.`);
    }
    if (delFacilities.size > 0) {
      warnings.push(`Deleting ${delFacilities.size} facility type(s) also removes them from every station and loses their icons.`);
    }

    // Deleted rows no longer count as existing for the checks below.
    delOperators.forEach((k) => { operatorSlugs.delete(k); for (const [n, sl] of operatorNames) if (sl === k) operatorNames.delete(n); });
    delLines.forEach((k) => lineSlugs.delete(k));
    delStations.forEach((k) => stationSlugs.delete(k));
    delFacilities.forEach((k) => { facilitySlugs.delete(k); for (const [n, sl] of facilityNames) if (sl === k) facilityNames.delete(n); });
    delTopPicks.forEach((k) => topPickSlugs.delete(k));
    delFloors.forEach((k) => floors.delete(k));
    for (const f of [...floors]) if (delStations.has(part(f, 0))) floors.delete(f);
    delLineStations.forEach((k) => lineOrders.get(part(k, 0))?.delete(part(k, 1)));
    for (const [line, m] of lineOrders) {
      if (delLines.has(line)) lineOrders.delete(line);
      else for (const st of [...m.keys()]) if (delStations.has(st)) m.delete(st);
    }
  }

  const norm = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  /** True when the row is new or any value in the file differs from the stored one. */
  const differs = (op: UpsertOp, key: string): boolean => {
    const stored = snap.stored[op.t as OpType]?.[key];
    if (!stored) return true;
    const skip = new Set([...KEY_FIELDS[op.t], "t"]);
    const notNull = NOT_NULL_FIELDS[op.t];
    for (const [field, value] of Object.entries(op)) {
      if (skip.has(field) || value === undefined) continue;
      if (value === null && notNull.includes(field)) continue;
      if (field === "exits") {
        const a = norm(value).split("|").filter(Boolean).sort().join("|");
        const b = norm(stored[field]).split("|").filter(Boolean).sort().join("|");
        if (a !== b) return true;
      } else if (field === "color" || field === "colorCode") {
        if (norm(value).toLowerCase() !== norm(stored[field]).toLowerCase()) return true;
      } else if (norm(value) !== norm(stored[field])) {
        return true;
      }
    }
    return false;
  };

  /** Counts the row and keeps it for saving only when it is new or changed. */
  const record = (sheet: SheetName, op: UpsertOp, key: string, exists: boolean) => {
    const c = counts.get(sheet) ?? { created: 0, updated: 0, unchanged: 0, deleted: 0 };
    if (!exists) {
      c.created += 1;
      ops.push(op);
    } else if (differs(op, key)) {
      c.updated += 1;
      ops.push(op);
    } else {
      c.unchanged += 1;
    }
    counts.set(sheet, c);
  };

  // ---- Field helpers --------------------------------------------------------
  const opt = (v: string): string | null => (v === "" ? null : v);
  /** undefined = column not in the file, null = empty cell, else the text. */
  const optCol = (data: Row, col: string): Opt<string> =>
    !(col in data) ? undefined : opt(data[col]);

  const text = (
    data: Row,
    col: string,
    max: number,
    err: (m: string) => void,
    required = false,
  ): Opt<string> => {
    if (!(col in data) && !required) return undefined;
    const v = data[col] ?? "";
    if (v === "") {
      if (required) err(`"${col}" is required.`);
      return null;
    }
    if (v.length > max) err(`"${col}" must be ${max} characters or less.`);
    return v;
  };

  const slugField = (data: Row, col: string, err: (m: string) => void): string => {
    const v = data[col] ?? "";
    if (!v) {
      err(`"${col}" is required.`);
      return "";
    }
    if (!SLUG_RE.test(v) || v.length > 150) {
      err(`"${col}" can only contain lowercase letters, numbers and hyphens.`);
    }
    return v;
  };

  const intField = (
    data: Row,
    col: string,
    err: (m: string) => void,
    min = 0,
    max = 100000,
  ): Opt<number> => {
    if (!(col in data)) return undefined;
    const v = data[col] ?? "";
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      err(`"${col}" must be a whole number from ${min} to ${max}.`);
      return null;
    }
    return n;
  };

  const oneOf = (
    data: Row,
    col: string,
    allowed: string[],
    err: (m: string) => void,
  ): Opt<string> => {
    if (!(col in data)) return undefined;
    const v = (data[col] ?? "").toLowerCase();
    if (v === "") return null;
    if (!allowed.includes(v)) {
      err(`"${col}" must be one of: ${allowed.join(", ")}.`);
      return null;
    }
    return v;
  };

  const urlField = (data: Row, col: string, err: (m: string) => void): Opt<string> => {
    if (!(col in data)) return undefined;
    const v = data[col] ?? "";
    if (v === "") return null;
    let ok = false;
    try {
      const u = new URL(v);
      ok = u.protocol === "https:" || u.protocol === "http:";
    } catch {
      ok = false;
    }
    if (!ok) err(`"${col}" must be a valid http(s) link.`);
    else if (v.length > 500) err(`"${col}" must be 500 characters or less.`);
    return v;
  };

  const duplicate = (
    seen: Set<string>,
    key: string,
    firstRows: Map<string, number>,
    rowNumber: number,
    err: (m: string) => void,
  ) => {
    if (seen.has(key)) {
      err(`Duplicate of row ${firstRows.get(key)} in this sheet.`);
      return true;
    }
    seen.add(key);
    firstRows.set(key, rowNumber);
    return false;
  };

  const eachRow = (
    sheet: SheetName,
    keyOf: (data: Row) => string,
    handler: (data: Row, err: (msg: string) => void, isDuplicate: boolean) => void,
  ) => {
    const seen = new Set<string>();
    const firstRows = new Map<string, number>();
    for (const { rowNumber, data } of sheets.get(sheet) ?? []) {
      const err = (message: string) => fail(sheet, rowNumber, message);
      const dup = duplicate(seen, keyOf(data), firstRows, rowNumber, err);
      handler(data, err, dup);
    }
  };

  // ---- operators -------------------------------------------------------------
  const opNameSeen = new Map<string, string>();
  eachRow("operators", (d) => d.slug, (d, err, dup) => {
    const slug = slugField(d, "slug", err);
    const name = text(d, "name", 150, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 150, err);
    const desc = text(d, "description", 1000, err);
    const descJa = text(d, "description_japanese", 1000, err);
    const url = urlField(d, "website_url", err);

    const owner = operatorNames.get(name.toLowerCase());
    const sameName = opNameSeen.get(name.toLowerCase());
    if (name && ((owner && owner !== slug) || (sameName && sameName !== slug))) {
      err(`Another operator already uses the name "${name}".`);
    }
    opNameSeen.set(name.toLowerCase(), slug);
    if (dup || !slug) return;

    const exists = operatorSlugs.has(slug);
    operatorSlugs.add(slug);
    operatorNames.set(name.toLowerCase(), slug);
    record("operators", { t: "operator", slug, name, nameJa, desc, descJa, url }, slug, exists);
  });

  // ---- lines -----------------------------------------------------------------
  eachRow("lines", (d) => d.slug, (d, err, dup) => {
    const slug = slugField(d, "slug", err);
    const operatorSlug = d.operator_slug ?? "";
    if (!operatorSlug) err(`"operator_slug" is required.`);
    else if (!operatorSlugs.has(operatorSlug)) {
      err(`Operator "${operatorSlug}" does not exist (add it in the operators sheet or Admin).`);
    }
    const name = text(d, "name", 150, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 150, err);
    const code = text(d, "code", 50, err);
    const color = optCol(d, "color");
    if (color && !HEX_RE.test(color)) err(`"color" must look like #9ACD32.`);
    const lineType = oneOf(d, "line_type", LINE_TYPES, err);
    const status = oneOf(d, "website_status", WEBSITE_STATUSES, err);
    const desc = text(d, "description", 1000, err);
    const descJa = text(d, "description_japanese", 1000, err);
    if (dup || !slug) return;

    const exists = lineSlugs.has(slug);
    lineSlugs.add(slug);
    record("lines", { t: "line", slug, operatorSlug, name, nameJa, code, color, lineType, status, desc, descJa }, slug, exists);
  });

  // ---- stations --------------------------------------------------------------
  eachRow("stations", (d) => d.slug, (d, err, dup) => {
    const slug = slugField(d, "slug", err);
    const name = text(d, "name", 150, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 150, err);
    const desc = text(d, "description", 2500, err);
    const descJa = text(d, "description_japanese", 2500, err);
    const about = text(d, "about", 150, err);
    const aboutJa = text(d, "about_japanese", 150, err);
    const locationUrl = urlField(d, "location_url", err);
    const region = text(d, "region", 100, err);
    const regionJa = text(d, "region_japanese", 100, err);
    const address = text(d, "address", 200, err);
    const addressJa = text(d, "address_japanese", 200, err);
    const exitsNote = text(d, "exits_note", 1000, err);
    const exitsNoteJa = text(d, "exits_note_japanese", 1000, err);
    const routesNote = text(d, "routes_note", 1000, err);
    const routesNoteJa = text(d, "routes_note_japanese", 1000, err);
    const sidesNote = text(d, "sides_note", 1500, err);
    const sidesNoteJa = text(d, "sides_note_japanese", 1500, err);
    const statLinesNote = text(d, "stat_lines_note", 150, err);
    const statLinesNoteJa = text(d, "stat_lines_note_japanese", 150, err);
    const statRidersValue = text(d, "stat_riders_value", 60, err);
    const statRidersNote = text(d, "stat_riders_note", 150, err);
    const statRidersNoteJa = text(d, "stat_riders_note_japanese", 150, err);
    const statOpenedValue = text(d, "stat_opened_value", 60, err);
    const statOpenedNote = text(d, "stat_opened_note", 150, err);
    const statOpenedNoteJa = text(d, "stat_opened_note_japanese", 150, err);

    let isVerified: Opt<number> = "is_verified" in d ? null : undefined;
    const rawVerified = (d.is_verified ?? "").toLowerCase();
    if (rawVerified !== "") {
      if (["1", "yes", "true"].includes(rawVerified)) isVerified = 1;
      else if (["0", "no", "false"].includes(rawVerified)) isVerified = 0;
      else err(`"is_verified" must be 1 or 0.`);
    }

    let verifiedAt: Opt<string> = optCol(d, "verified_at");
    if (verifiedAt && /^\d+(\.\d+)?$/.test(verifiedAt)) {
      verifiedAt = excelSerialToDate(Number(verifiedAt));
    }
    if (verifiedAt) {
      const date = new Date(`${verifiedAt}T00:00:00Z`);
      if (!DATE_RE.test(verifiedAt) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== verifiedAt) {
        err(`"verified_at" must be a date like 2026-10-01.`);
      }
    }
    if (dup || !slug) return;

    const exists = stationSlugs.has(slug);
    stationSlugs.add(slug);
    record("stations", { t: "station", slug, name, nameJa, desc, descJa, about, aboutJa, locationUrl, isVerified, verifiedAt, region, regionJa, address, addressJa, statLinesNote, statLinesNoteJa, statRidersValue, statRidersNote, statRidersNoteJa, statOpenedValue, statOpenedNote, statOpenedNoteJa, sidesNote, sidesNoteJa, routesNote, routesNoteJa, exitsNote, exitsNoteJa }, slug, exists);
  });

  // ---- line_stations ---------------------------------------------------------
  const lsOps: Extract<UpsertOp, { t: "lineStation" }>[] = [];
  eachRow("line_stations", (d) => `${d.line_slug}|${d.station_slug}`, (d, err, dup) => {
    const lineSlug = d.line_slug ?? "";
    const stationSlug = d.station_slug ?? "";
    if (!lineSlugs.has(lineSlug)) err(`Line "${lineSlug}" does not exist.`);
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const order = intField(d, "station_order", err, 0, 10000);
    if (order == null && (d.station_order ?? "") === "") err(`"station_order" is required.`);
    const code = text(d, "station_code", 50, err);
    if (dup || order == null || !lineSlugs.has(lineSlug) || !stationSlugs.has(stationSlug)) return;

    lsOps.push({ t: "lineStation", lineSlug, stationSlug, order, code });
  });

  // Station order must stay unique within a line after the upload.
  const finalOrders = new Map<string, Map<string, number>>();
  for (const [line, m] of lineOrders) finalOrders.set(line, new Map(m));
  for (const op of lsOps) {
    const m = finalOrders.get(op.lineSlug) ?? new Map<string, number>();
    m.set(op.stationSlug, op.order);
    finalOrders.set(op.lineSlug, m);
  }
  const clashes = new Set<string>();
  for (const [line, m] of finalOrders) {
    const used = new Map<number, string>();
    for (const [station, order] of m) {
      const other = used.get(order);
      if (other !== undefined) clashes.add(`${line}|${order}|${other}|${station}`);
      used.set(order, station);
    }
  }
  const rowOf = new Map<string, number>();
  for (const { rowNumber, data } of sheets.get("line_stations") ?? []) {
    rowOf.set(`${data.line_slug}|${data.station_slug}`, rowNumber);
  }
  for (const key of clashes) {
    const [line, order, a, b] = key.split("|");
    const row = rowOf.get(`${line}|${a}`) ?? rowOf.get(`${line}|${b}`) ?? 0;
    fail("line_stations", row, `Stations "${a}" and "${b}" would both be number ${order} on line "${line}".`);
  }
  for (const op of lsOps) {
    const exists = lineOrders.get(op.lineSlug)?.has(op.stationSlug) ?? false;
    record("line_stations", op, `${op.lineSlug}|${op.stationSlug}`, exists);
  }

  // ---- facilities ------------------------------------------------------------
  // Never imported: facilities (icons, groups, names) are managed in Admin > Facilities.
  // floor_facilities may only use facility slugs that already exist there.
  if ((raw.facilities ?? []).length > 1) {
    warnings.push("The facilities sheet is ignored: facilities are managed in Admin > Facilities, an import never changes or deletes them.");
  }

  // ---- floors ----------------------------------------------------------------
  eachRow("floors", (d) => `${d.station_slug}|${d.name}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const name = text(d, "name", 100, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 100, err);
    const floorOrder = intField(d, "floor_order", err, -100, 1000);
    if (dup || !name || !stationSlugs.has(stationSlug)) return;

    const key = `${stationSlug}|${name}`;
    const exists = floors.has(key);
    floors.add(key);
    record("floors", { t: "floor", stationSlug, name, nameJa, floorOrder }, key, exists);
  });

  const fileExitKeys = new Set(
    (sheets.get("exits") ?? []).map((r) => `${r.data.station_slug}|${r.data.name}`),
  );
  const knownExit = (station: string, name: string) => {
    const key = `${station}|${name}`;
    return fileExitKeys.has(key) || (exits.has(key) && !removedExits.has(key));
  };

  // ---- floor_facilities ------------------------------------------------------
  eachRow("floor_facilities", (d) => `${d.station_slug}|${d.floor_name}|${d.facility_slug}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    const floorName = d.floor_name ?? "";
    const facilitySlug = d.facility_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    else if (!floors.has(`${stationSlug}|${floorName}`)) err(`Floor "${floorName}" does not exist for station "${stationSlug}".`);
    if (!facilitySlugs.has(facilitySlug)) err(`Facility "${facilitySlug}" does not exist.`);
    const count = intField(d, "facility_count", err);
    const note = text(d, "note", 500, err);
    const noteJa = text(d, "note_japanese", 500, err);
    const locationType = oneOf(d, "location_type", FACILITY_LOCATIONS, err);
    const sortOrder = intField(d, "sort_order", err);

    // Nearby exits: names separated by commas, semicolons or line breaks.
    let exitsValue: Opt<string> = undefined;
    if ("exits" in d) {
      const names = [...new Set((d.exits ?? "").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))];
      for (const name of names) {
        if (!knownExit(stationSlug, name)) {
          err(`Exit "${name}" does not exist for station "${stationSlug}" (add it in the exits sheet).`);
        }
      }
      exitsValue = names.length > 0 ? names.sort().join("|") : null;
    }
    if (dup || !floors.has(`${stationSlug}|${floorName}`) || !facilitySlugs.has(facilitySlug)) return;

    const key = `${stationSlug}|${floorName}|${facilitySlug}`;
    const exists = floorFacilities.has(key);
    floorFacilities.add(key);
    record("floor_facilities", { t: "floorFacility", stationSlug, floorName, facilitySlug, count, note, noteJa, locationType, sortOrder, exits: exitsValue }, key, exists);
  });

  // ---- exits -----------------------------------------------------------------
  eachRow("exits", (d) => `${d.station_slug}|${d.name}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    const floorName = d.floor_name ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    else if (!floors.has(`${stationSlug}|${floorName}`)) err(`Floor "${floorName}" does not exist for station "${stationSlug}".`);
    const name = text(d, "name", 150, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 150, err);
    const code = text(d, "code", 50, err);
    const colorCode = optCol(d, "color_code");
    if (colorCode && !HEX_RE.test(colorCode)) err(`"color_code" must look like #FF3B30.`);
    const desc = text(d, "description", 500, err);
    const descJa = text(d, "description_japanese", 500, err);
    const photoCaption = text(d, "photo_caption", 400, err);
    const photoCaptionJa = text(d, "photo_caption_japanese", 400, err);
    const sortOrder = intField(d, "sort_order", err);
    if (dup || !name || !floors.has(`${stationSlug}|${floorName}`)) return;

    const key = `${stationSlug}|${name}`;
    const exists = exits.has(key);
    exits.add(key);
    record("exits", { t: "exit", stationSlug, floorName, name, nameJa, code, colorCode, desc, descJa, photoCaption, photoCaptionJa, sortOrder }, key, exists);
  });

  // ---- platforms -------------------------------------------------------------
  eachRow("platforms", (d) => `${d.station_slug}|${d.platform_number}|${d.line_slug ?? ""}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const lineSlug = opt(d.line_slug ?? "");
    if (lineSlug && !lineSlugs.has(lineSlug)) err(`Line "${lineSlug}" does not exist.`);
    const floorName = optCol(d, "floor_name");
    if (floorName && !floors.has(`${stationSlug}|${floorName}`)) err(`Floor "${floorName}" does not exist for station "${stationSlug}".`);
    const number = text(d, "platform_number", 50, err, true) ?? "";
    const dest = text(d, "destinations", 500, err);
    const destJa = text(d, "destinations_japanese", 500, err);
    const notes = text(d, "notes", 2000, err);
    const notesJa = text(d, "notes_japanese", 2000, err);
    const group = text(d, "platform_group", 80, err);
    const groupJa = text(d, "platform_group_japanese", 80, err);
    const sortOrder = intField(d, "sort_order", err);
    if (dup || !number || !stationSlugs.has(stationSlug)) return;

    const key = `${stationSlug}|${number}|${lineSlug ?? ""}`;
    const exists = platforms.has(key);
    platforms.add(key);
    record("platforms", { t: "platform", stationSlug, lineSlug, floorName, number, dest, destJa, notes, notesJa, group, groupJa, sortOrder }, key, exists);
  });

  // ---- sides -----------------------------------------------------------------
  eachRow("sides", (d) => `${d.station_slug}|${d.name}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const name = text(d, "name", 80, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 80, err);
    const subtitle = text(d, "subtitle", 120, err);
    const subtitleJa = text(d, "subtitle_japanese", 120, err);
    const desc = text(d, "description", 1500, err);
    const descJa = text(d, "description_japanese", 1500, err);
    const sortOrder = intField(d, "sort_order", err);
    if (dup || !name || !stationSlugs.has(stationSlug)) return;

    const key = `${stationSlug}|${name}`;
    const exists = sides.has(key);
    sides.add(key);
    record("sides", { t: "side", stationSlug, name, nameJa, subtitle, subtitleJa, desc, descJa, sortOrder }, key, exists);
  });

  // ---- routes ----------------------------------------------------------------
  eachRow("routes", (d) => `${d.station_slug}|${d.from_place}|${d.route ?? ""}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const fromPlace = text(d, "from_place", 80, err, true) ?? "";
    const fromPlaceJa = text(d, "from_place_japanese", 80, err);
    const route = opt(d.route ?? "");
    if ((d.route ?? "").length > 500) err(`"route" must be 500 characters or less.`);
    const routeJa = text(d, "route_japanese", 500, err);
    const time = text(d, "travel_time", 60, err);
    const timeJa = text(d, "travel_time_japanese", 60, err);
    const cost = text(d, "cost", 120, err);
    const costJa = text(d, "cost_japanese", 120, err);
    const sortOrder = intField(d, "sort_order", err);
    if (dup || !fromPlace || !stationSlugs.has(stationSlug)) return;

    const key = `${stationSlug}|${fromPlace}|${route ?? ""}`;
    const exists = routes.has(key);
    routes.add(key);
    record("routes", { t: "route", stationSlug, fromPlace, fromPlaceJa, route, routeJa, time, timeJa, cost, costJa, sortOrder }, key, exists);
  });

  // ---- tips ------------------------------------------------------------------
  eachRow("tips", (d) => `${d.station_slug}|${d.tip}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const tip = text(d, "tip", 600, err, true) ?? "";
    const tipJa = text(d, "tip_japanese", 600, err);
    const sortOrder = intField(d, "sort_order", err);
    if (dup || !tip || !stationSlugs.has(stationSlug)) return;

    const key = `${stationSlug}|${tip}`;
    const exists = tips.has(key);
    tips.add(key);
    record("tips", { t: "tip", stationSlug, tip, tipJa, sortOrder }, key, exists);
  });

  // ---- seasons ---------------------------------------------------------------
  eachRow("seasons", (d) => `${d.station_slug}|${(d.season ?? "").toLowerCase()}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    const season = (d.season ?? "").toLowerCase();
    if (!SEASONS.includes(season)) err(`"season" must be one of: ${SEASONS.join(", ")}.`);
    const months = text(d, "months", 40, err);
    const monthsJa = text(d, "months_japanese", 40, err);
    const desc = text(d, "description", 600, err);
    const descJa = text(d, "description_japanese", 600, err);
    if (dup || !SEASONS.includes(season) || !stationSlugs.has(stationSlug)) return;

    const key = `${stationSlug}|${season}`;
    const exists = seasons.has(key);
    seasons.add(key);
    record("seasons", { t: "season", stationSlug, season, months, monthsJa, desc, descJa }, key, exists);
  });

  // ---- top_picks -------------------------------------------------------------
  eachRow("top_picks", (d) => d.slug, (d, err, dup) => {
    const slug = slugField(d, "slug", err);
    const name = text(d, "name", 150, err, true) ?? "";
    const nameJa = text(d, "name_japanese", 150, err);
    const category = oneOf(d, "category", TOP_PICK_CATEGORIES, err);
    const desc = text(d, "description", 1000, err);
    const descJa = text(d, "description_japanese", 1000, err);
    const entryFee = text(d, "entry_fee", 150, err);
    const entryFeeJa = text(d, "entry_fee_japanese", 150, err);
    const notes = text(d, "notes", 150, err);
    const notesJa = text(d, "notes_japanese", 150, err);
    const mapUrl = urlField(d, "map_url", err);
    if (dup || !slug) return;

    const exists = topPickSlugs.has(slug);
    topPickSlugs.add(slug);
    record("top_picks", { t: "topPick", slug, name, nameJa, category, desc, descJa, entryFee, entryFeeJa, notes, notesJa, mapUrl }, slug, exists);
  });

  // ---- station_top_picks -----------------------------------------------------
  eachRow("station_top_picks", (d) => `${d.station_slug}|${d.top_pick_slug}`, (d, err, dup) => {
    const stationSlug = d.station_slug ?? "";
    const topPickSlug = d.top_pick_slug ?? "";
    if (!stationSlugs.has(stationSlug)) err(`Station "${stationSlug}" does not exist.`);
    if (!topPickSlugs.has(topPickSlug)) err(`Top pick "${topPickSlug}" does not exist.`);
    const minutes = intField(d, "walking_minutes", err, 0, 600);
    const locationType = oneOf(d, "location_type", TOP_PICK_LOCATIONS, err);
    const sortOrder = intField(d, "sort_order", err);
    if (dup || !stationSlugs.has(stationSlug) || !topPickSlugs.has(topPickSlug)) return;

    const key = `${stationSlug}|${topPickSlug}`;
    const exists = stationTopPicks.has(key);
    stationTopPicks.add(key);
    record("station_top_picks", { t: "stationTopPick", stationSlug, topPickSlug, minutes, locationType, sortOrder }, key, exists);
  });

  const summary: SheetSummary[] = SHEET_ORDER.filter((s) => counts.has(s)).map(
    (sheet) => ({ sheet, ...counts.get(sheet)! }),
  );

  if (summary.length === 0 && totalErrors === 0) {
    fail("-", 0, "No data rows found. Fill the sheets of the template (row 2 is only an example) and try again.");
  }

  return {
    ops: totalErrors > 0 ? [] : ops,
    preview: {
      ok: totalErrors === 0,
      summary,
      errors,
      totalErrors,
      warnings,
      deletions,
    },
  };
}
