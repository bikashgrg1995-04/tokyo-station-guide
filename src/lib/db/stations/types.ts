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

export interface StationPlatformItem {
  number: string;
  line: string | null;
  lineCode: string | null;
  notes: string | null;
}

export interface Station {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  about: string | null;

  /*
   * Compatibility fields.
   *
   * The actual data is stored relationally in:
   * - station_facilities -> facilities
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

export interface StationSearchResult {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  line_name: string | null;
  line_code: string | null;
  station_code: string | null;
}

export interface StationAdminListItem {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
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
  about: string | null;
  facilities: string | null;
  top_picks: string | null;
  connections: string | null;
  platforms: string | null;
}

export interface StationFacilityInput {
  facilityId: number;
  floor: string;
  facilityCount: number;
  note?: string | null;
}

export interface CreateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  about?: string | null;
  facilities?: string | null;
  /** Floor-wise facility entries to save. */
  stationFacilities?: StationFacilityInput[];
  topPicks?: string | null;
  /** Facility ids to save (used instead of `facilities` when given). */
  facilityIds?: number[];
  /** Top pick ids to save, in order (used instead of `topPicks` when given). */
  topPickIds?: number[];
  isVerified?: boolean;
}

export interface UpdateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  about?: string | null;
  facilities?: string | null;
  /** Floor-wise facility entries to save. */
  stationFacilities?: StationFacilityInput[];
  topPicks?: string | null;
  /** Facility ids to save (used instead of `facilities` when given). */
  facilityIds?: number[];
  /** Top pick ids to save, in order (used instead of `topPicks` when given). */
  topPickIds?: number[];
  isVerified?: boolean;
}

export interface PaginatedStations {
  items: StationAdminListItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}
