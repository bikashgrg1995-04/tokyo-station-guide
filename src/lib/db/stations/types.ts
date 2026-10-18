/* ========================================
   Station types
======================================== */

export interface StationLine {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  operator_name: string;
}

export interface Station {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  location_url: string | null;
  description: string | null;
  description_japanese: string | null;
  about: string | null;
  about_japanese: string | null;

  /*
   * Compatibility fields.
   *
   * The actual data is stored relationally in:
   * - station_floors -> station_floor_facilities -> facilities
   * - station_top_picks -> top_picks
   * - line_stations -> lines -> operators
   *
   * They are returned as JSON strings because the
   * existing public UI expects this format.
   */
  facilities: string | null;
  facility_details: string | null;
  top_picks: string | null;
  connections: string | null;
  platforms: string | null;

  is_verified: number;
  verified_at: string | null;

  created_at: string;
  updated_at: string;
  lines: StationLine[];
}

export interface StationListItem {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
}

export interface StationAdminListItem {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  location_url: string | null;
  description: string | null;
  is_verified: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/*
 * Used by the admin edit page.
 */
export interface StationEditItem extends StationAdminListItem {
  description_japanese: string | null;
  about: string | null;
  about_japanese: string | null;
  facilities: string | null;
  top_picks: string | null;
  connections: string | null;
  platforms: string | null;
}

export interface StationFacilityInput {
  facilityId: number;
  floorId: number;
  facilityCount: number;
  /** Inside or outside the station. Defaults to inside. */
  locationType?: "inside" | "outside";
  note?: string | null;
  noteJapanese?: string | null;
  exitIds?: number[];
}

export interface CreateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  locationUrl?: string | null;
  description?: string | null;
  descriptionJapanese?: string | null;
  about?: string | null;
  aboutJapanese?: string | null;
  facilities?: string | null;
  /** Floor-wise facility entries to save. */
  stationFacilities?: StationFacilityInput[];
  topPicks?: string | null;
  /** Facility ids to save (used instead of `facilities` when given). */
  facilityIds?: number[];
  /** Top pick ids to save, in order (used instead of `topPicks` when given). */
  topPickIds?: number[];
  isVerified?: boolean;
  /** Verification date (YYYY-MM-DD). Defaults to today when verified. */
  verifiedAt?: string | null;
}

export interface UpdateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  locationUrl?: string | null;
  description?: string | null;
  descriptionJapanese?: string | null;
  about?: string | null;
  aboutJapanese?: string | null;
  facilities?: string | null;
  /** Floor-wise facility entries to save. */
  stationFacilities?: StationFacilityInput[];
  topPicks?: string | null;
  /** Facility ids to save (used instead of `facilities` when given). */
  facilityIds?: number[];
  /** Top pick ids to save, in order (used instead of `topPicks` when given). */
  topPickIds?: number[];
  isVerified?: boolean;
  /** Verification date (YYYY-MM-DD). Defaults to today when verified. */
  verifiedAt?: string | null;
}

export interface PaginatedStations {
  items: StationAdminListItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}
