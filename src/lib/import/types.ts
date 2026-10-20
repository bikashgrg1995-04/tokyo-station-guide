/** What already exists in the database (slugs / names only), used to check an upload. */
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
}

/** A null field means "cell left empty": keep the stored value on update. */
export type ImportOp =
  | { t: "operator"; slug: string; name: string; nameJa: string | null; desc: string | null; descJa: string | null; url: string | null }
  | { t: "line"; slug: string; operatorSlug: string; name: string; nameJa: string | null; code: string | null; color: string | null; lineType: string | null; status: string | null; desc: string | null; descJa: string | null }
  | { t: "station"; slug: string; name: string; nameJa: string | null; desc: string | null; descJa: string | null; about: string | null; aboutJa: string | null; locationUrl: string | null; isVerified: number | null; verifiedAt: string | null }
  | { t: "lineStation"; lineSlug: string; stationSlug: string; order: number; code: string | null }
  | { t: "facility"; slug: string; name: string; nameJa: string | null; sortOrder: number | null }
  | { t: "floor"; stationSlug: string; name: string; nameJa: string | null; floorOrder: number | null }
  | { t: "floorFacility"; stationSlug: string; floorName: string; facilitySlug: string; count: number | null; note: string | null; noteJa: string | null; locationType: string | null; sortOrder: number | null }
  | { t: "exit"; stationSlug: string; floorName: string; name: string; nameJa: string | null; code: string | null; colorCode: string | null; desc: string | null; descJa: string | null; sortOrder: number | null }
  | { t: "platform"; stationSlug: string; lineSlug: string | null; floorName: string | null; number: string; dest: string | null; destJa: string | null; notes: string | null; notesJa: string | null; sortOrder: number | null }
  | { t: "topPick"; slug: string; name: string; nameJa: string | null; category: string | null; desc: string | null; descJa: string | null; entryFee: string | null; entryFeeJa: string | null; notes: string | null; notesJa: string | null; mapUrl: string | null }
  | { t: "stationTopPick"; stationSlug: string; topPickSlug: string; minutes: number | null; locationType: string | null; sortOrder: number | null };
