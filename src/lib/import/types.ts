/**
 * Value of one importable field in a row of the file:
 *  - a value      = save it
 *  - null         = the cell was left empty: clear the stored value
 *  - undefined    = the column is not in the file at all: keep the stored value
 */
export type Opt<T> = T | null | undefined;

export type OpType =
  | "operator"
  | "line"
  | "station"
  | "lineStation"
  | "facility"
  | "floor"
  | "floorFacility"
  | "exit"
  | "platform"
  | "topPick"
  | "stationTopPick";

/** Stored values of one existing row, named like the fields of its ImportOp. */
export type StoredRow = Record<string, string | number | null>;

/** What already exists in the database (keys, plus the stored values to detect changes). */
export interface ImportSnapshot {
  operators: { slug: string; name: string }[];
  lines: { slug: string }[];
  stations: { slug: string }[];
  facilities: { slug: string; name: string }[];
  topPicks: { slug: string }[];
  /** `stationSlug|floorName` */
  floors: string[];
  /** `stationSlug|exitName` */
  exits: string[];
  /** `stationSlug|platformNumber|lineSlug` (lineSlug empty when none) */
  platforms: string[];
  /** `stationSlug|floorName|facilitySlug` */
  floorFacilities: string[];
  /** `stationSlug|topPickSlug` */
  stationTopPicks: string[];
  lineStations: { lineSlug: string; stationSlug: string; order: number }[];
  /** Stored values per row type, keyed like the arrays above (lineStation: `lineSlug|stationSlug`). */
  stored: Record<OpType, Record<string, StoredRow>>;
}

/** Fields that identify a row (never compared or changed by an import). */
export const KEY_FIELDS: Record<OpType, string[]> = {
  operator: ["slug"],
  line: ["slug"],
  station: ["slug"],
  lineStation: ["lineSlug", "stationSlug"],
  facility: ["slug"],
  floor: ["stationSlug", "name"],
  floorFacility: ["stationSlug", "floorName", "facilitySlug"],
  exit: ["stationSlug", "name"],
  platform: ["stationSlug", "lineSlug", "number"],
  topPick: ["slug"],
  stationTopPick: ["stationSlug", "topPickSlug"],
};

/** Fields that can never be empty in the database: an empty cell keeps the stored value. */
export const NOT_NULL_FIELDS: Record<OpType, string[]> = {
  operator: ["name"],
  line: ["name", "operatorSlug", "lineType", "status"],
  station: ["name", "isVerified"],
  lineStation: ["order"],
  facility: ["name", "sortOrder", "category"],
  floor: ["floorOrder"],
  floorFacility: ["locationType", "sortOrder"],
  exit: ["floorName", "sortOrder"],
  platform: ["sortOrder"],
  topPick: ["name", "category"],
  stationTopPick: ["locationType", "sortOrder"],
};

/** Removes a row that is in the database but not in the (synced) sheet. */
export interface DeleteOp {
  t: "delete";
  type: OpType;
  key: string;
}

export type UpsertOp =
  | { t: "operator"; slug: string; name: string; nameJa: Opt<string>; desc: Opt<string>; descJa: Opt<string>; url: Opt<string> }
  | { t: "line"; slug: string; operatorSlug: string; name: string; nameJa: Opt<string>; code: Opt<string>; color: Opt<string>; lineType: Opt<string>; status: Opt<string>; desc: Opt<string>; descJa: Opt<string> }
  | { t: "station"; slug: string; name: string; nameJa: Opt<string>; desc: Opt<string>; descJa: Opt<string>; about: Opt<string>; aboutJa: Opt<string>; locationUrl: Opt<string>; isVerified: Opt<number>; verifiedAt: Opt<string>; region: Opt<string>; regionJa: Opt<string>; statLinesNote: Opt<string>; statLinesNoteJa: Opt<string>; statRidersValue: Opt<string>; statRidersNote: Opt<string>; statRidersNoteJa: Opt<string>; statOpenedValue: Opt<string>; statOpenedNote: Opt<string>; statOpenedNoteJa: Opt<string> }
  | { t: "lineStation"; lineSlug: string; stationSlug: string; order: number; code: Opt<string> }
  | { t: "facility"; slug: string; name: string; nameJa: Opt<string>; sortOrder: Opt<number>; category: Opt<string> }
  | { t: "floor"; stationSlug: string; name: string; nameJa: Opt<string>; floorOrder: Opt<number> }
  | { t: "floorFacility"; stationSlug: string; floorName: string; facilitySlug: string; count: Opt<number>; note: Opt<string>; noteJa: Opt<string>; locationType: Opt<string>; sortOrder: Opt<number>; /** nearby exit names, sorted, joined with "|" */ exits: Opt<string> }
  | { t: "exit"; stationSlug: string; floorName: string; name: string; nameJa: Opt<string>; code: Opt<string>; colorCode: Opt<string>; desc: Opt<string>; descJa: Opt<string>; sortOrder: Opt<number> }
  | { t: "platform"; stationSlug: string; lineSlug: string | null; floorName: Opt<string>; number: string; dest: Opt<string>; destJa: Opt<string>; notes: Opt<string>; notesJa: Opt<string>; group: Opt<string>; groupJa: Opt<string>; sortOrder: Opt<number> }
  | { t: "topPick"; slug: string; name: string; nameJa: Opt<string>; category: Opt<string>; desc: Opt<string>; descJa: Opt<string>; entryFee: Opt<string>; entryFeeJa: Opt<string>; notes: Opt<string>; notesJa: Opt<string>; mapUrl: Opt<string> }
  | { t: "stationTopPick"; stationSlug: string; topPickSlug: string; minutes: Opt<number>; locationType: Opt<string>; sortOrder: Opt<number> };

export type ImportOp = UpsertOp | DeleteOp;
