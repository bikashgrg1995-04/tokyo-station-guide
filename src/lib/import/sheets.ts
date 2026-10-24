/**
 * Bulk import: the sheets of the Excel template, in the order they are applied.
 * Shared by the importer (server) and the page (to list sheet names).
 *
 * Rows link to each other by slug / name, never by ID.
 */

export type SheetName =
  | "operators"
  | "lines"
  | "stations"
  | "line_stations"
  | "facilities"
  | "floors"
  | "floor_facilities"
  | "exits"
  | "platforms"
  | "sides"
  | "routes"
  | "top_picks"
  | "station_top_picks";

/** Import order: a sheet may only refer to sheets above it. */
export const SHEET_ORDER: SheetName[] = [
  "operators",
  "lines",
  "stations",
  "line_stations",
  "floors",
  "floor_facilities",
  "exits",
  "platforms",
  "sides",
  "routes",
  "top_picks",
  "station_top_picks",
];

/** Columns every sheet must have (extra columns are ignored). */
export const REQUIRED_COLUMNS: Record<SheetName, string[]> = {
  operators: ["slug", "name"],
  lines: ["slug", "operator_slug", "name"],
  stations: ["slug", "name"],
  line_stations: ["line_slug", "station_slug", "station_order"],
  facilities: ["slug", "name"],
  floors: ["station_slug", "name"],
  floor_facilities: ["station_slug", "floor_name", "facility_slug"],
  exits: ["station_slug", "floor_name", "name"],
  platforms: ["station_slug", "platform_number"],
  sides: ["station_slug", "name"],
  routes: ["station_slug", "from_place"],
  top_picks: ["slug", "name"],
  station_top_picks: ["station_slug", "top_pick_slug"],
};

export const LINE_TYPES = ["jr", "subway", "private", "shinkansen", "express"];
export const WEBSITE_STATUSES = ["live", "coming_soon", "hidden"];
export const FACILITY_LOCATIONS = ["inside", "outside"];
export const TOP_PICK_LOCATIONS = ["inside", "outside", "inside_outside"];
export const TOP_PICK_CATEGORIES = [
  "landmark",
  "food",
  "shopping",
  "museum",
  "park",
  "temple",
];

/** Hard limits so one upload cannot be huge. */
export const MAX_ROWS_PER_SHEET = 1500;
export const MAX_ROWS_TOTAL = 2000;

/** A first cell starting with "#" marks a comment / example row, which is skipped. */
export const COMMENT_PREFIX = "#";

export type RawSheets = Record<string, string[][]>;

export interface ImportIssue {
  sheet: string;
  /** Excel row number (header = 1), or 0 for a whole-sheet problem. */
  row: number;
  message: string;
}

export interface SheetSummary {
  /** Rows already identical to the database (skipped). */
  unchanged: number;
  /** Rows removed because the (synced) sheet no longer has them. */
  deleted: number;
  sheet: SheetName;
  created: number;
  updated: number;
}

export interface ImportPreview {
  ok: boolean;
  summary: SheetSummary[];
  errors: ImportIssue[];
  totalErrors: number;
  warnings: string[];
  /** Keys of the rows that will be deleted (first few per sheet). */
  deletions: { sheet: SheetName; total: number; keys: string[] }[];
}
