import {
  assignPlace,
  createPlace,
  deletePlace,
  getAllPlaces,
  getPlaceById,
  getPlacesPaginated,
  getRestaurantsNote,
  getStationPlaces,
  hasPlaceAssignments,
  saveRestaurantsNote,
  unassignPlace,
  updatePlace,
  type Place,
  type PlaceInput,
  type PlaceKindInfo,
  type StationPlace,
} from "../db/places";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";
import { isUniqueViolation, paginationUrlFor, readListQuery, readText } from "./common";

const PER_PAGE = 10;
const listPath = (k: PlaceKindInfo) => `/admin/${k.route}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const validUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/* ---- list ---- */

export async function loadPlaceList(db: D1Database, k: PlaceKindInfo, url: URL) {
  const { search, page } = readListQuery(url);
  const r = await getPlacesPaginated(db, k, { page, perPage: PER_PAGE, search });
  return {
    ...r,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(listPath(k), url, search),
  };
}

export async function handlePlaceDelete(request: Request, db: D1Database, k: PlaceKindInfo, rawId: string | undefined, env: unknown) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0 || request.method !== "POST") return listPath(k);
  try {
    if (await hasPlaceAssignments(db, k, id)) return `${listPath(k)}?error=assigned`;
    const existing = await getPlaceById(db, k, id);
    await deletePlace(db, k, id);
    await deleteStationImage(iconBucket(env as never), existing?.photo);
    return listPath(k);
  } catch (err) {
    console.error(`Failed to delete ${k.kind}:`, err);
    return `${listPath(k)}?error=delete`;
  }
}

/* ---- create / edit form ---- */

export interface PlaceFormValues {
  slug: string;
  name: string;
  nameJapanese: string;
  kind: string;
  kindJapanese: string;
  description: string;
  descriptionJapanese: string;
  mapUrl: string;
  bookingUrl: string;
}

export interface PlaceFormResult {
  redirectTo: string | null;
  place: Place | null;
  values: PlaceFormValues;
  formError: string;
}

const emptyValues = (): PlaceFormValues => ({
  slug: "", name: "", nameJapanese: "", kind: "", kindJapanese: "", description: "", descriptionJapanese: "",
  mapUrl: "", bookingUrl: "",
});

export async function handlePlaceForm(
  request: Request,
  db: D1Database,
  k: PlaceKindInfo,
  rawId: string | undefined,
  env: unknown,
): Promise<PlaceFormResult> {
  const id = rawId === undefined ? null : Number(rawId);
  const place = id !== null && Number.isInteger(id) && id > 0 ? await getPlaceById(db, k, id) : null;
  const result: PlaceFormResult = { redirectTo: null, place, values: emptyValues(), formError: "" };

  if (id !== null && !place) {
    result.redirectTo = listPath(k);
    return result;
  }
  if (place) {
    result.values = {
      slug: place.slug, name: place.name, nameJapanese: place.name_japanese ?? "", kind: place.kind ?? "",
      kindJapanese: place.kind_japanese ?? "", description: place.description ?? "",
      descriptionJapanese: place.description_japanese ?? "", mapUrl: place.map_url ?? "", bookingUrl: place.booking_url ?? "",
    };
  }
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const v: PlaceFormValues = {
    slug: readText(fd, "slug").toLowerCase(),
    name: readText(fd, "name"),
    nameJapanese: readText(fd, "name_japanese"),
    kind: readText(fd, "kind"),
    kindJapanese: readText(fd, "kind_japanese"),
    description: readText(fd, "description"),
    descriptionJapanese: readText(fd, "description_japanese"),
    mapUrl: readText(fd, "map_url"),
    bookingUrl: k.hasBooking ? readText(fd, "booking_url") : "",
  };
  result.values = v;

  const slug = v.slug || slugify(v.name);
  const fail = (m: string) => {
    result.formError = m;
    return result;
  };
  if (!v.name) return fail("The name is required.");
  if (v.name.length > 150 || v.nameJapanese.length > 150) return fail("The name must be 150 characters or less.");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return fail("The slug can only have lowercase letters, numbers and hyphens.");
  if (v.kind.length > 80 || v.kindJapanese.length > 80) return fail("The kind must be 80 characters or less.");
  if (v.description.length > 800 || v.descriptionJapanese.length > 800) return fail("The description must be 800 characters or less.");
  for (const url of [v.mapUrl, v.bookingUrl]) {
    if (url && (!validUrl(url) || url.length > 500)) return fail("Links must be valid http(s) links of 500 characters or less.");
  }

  const file = readStationImageFile(fd, "photo_file");
  const check = file ? await checkStationImage(file) : null;
  if (check && !check.ok) return fail(check.error);

  const bucket = iconBucket(env as never);
  let uploaded: string | null = null;
  const input: PlaceInput = {
    slug,
    name: v.name,
    nameJapanese: v.nameJapanese || null,
    kind: v.kind || null,
    kindJapanese: v.kindJapanese || null,
    description: v.description || null,
    descriptionJapanese: v.descriptionJapanese || null,
    mapUrl: v.mapUrl || null,
    bookingUrl: v.bookingUrl || null,
  };

  try {
    if (check?.ok) {
      if (!bucket) return fail("Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
      uploaded = await saveStationImage(bucket, slug, check);
      input.photo = uploaded;
    } else if (place && fd.get("remove_photo") === "on") {
      input.photo = null;
    }

    if (place) {
      await updatePlace(db, k, place.id, input);
      if (input.photo !== undefined) await deleteStationImage(bucket, place.photo);
    } else {
      await createPlace(db, k, input);
    }
    result.redirectTo = listPath(k);
  } catch (err) {
    await deleteStationImage(bucket, uploaded);
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    result.formError = isUniqueViolation(msg, "slug")
      ? "This slug is already used. Choose another one."
      : "Unable to save. Please try again.";
  }
  return result;
}

/* ---- assigning to a station ---- */

export interface StationPlacesResult {
  redirectTo: string | null;
  assigned: StationPlace[];
  available: { id: number; name: string }[];
  note: string;
  noteJapanese: string;
  formError: string;
  /** "new", "<placeId>" or "note" */
  errorFor: string;
}

export async function handleStationPlaces(
  request: Request,
  db: D1Database,
  k: PlaceKindInfo,
  stationId: number,
): Promise<StationPlacesResult> {
  const load = async () => {
    const assigned = await getStationPlaces(db, k, stationId);
    const all = await getAllPlaces(db, k);
    const have = new Set(assigned.map((a) => a.place_id));
    return { assigned, available: all.filter((p) => !have.has(p.id)) };
  };
  const result: StationPlacesResult = {
    redirectTo: null,
    ...(await load()),
    ...(k.kind === "restaurant" ? await getRestaurantsNote(db, stationId) : { note: "", noteJapanese: "" }),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "place_action");
  const placeId = Number(readText(fd, "place_id"));
  const fail = (scope: string, m: string) => {
    result.errorFor = scope;
    result.formError = m;
    return result;
  };

  try {
    if (action === "note_save" && k.kind === "restaurant") {
      const note = readText(fd, "restaurants_note");
      const noteJa = readText(fd, "restaurants_note_japanese");
      if (note.length > 1000 || noteJa.length > 1000) return fail("note", "The note must be 1000 characters or less.");
      await saveRestaurantsNote(db, stationId, note || null, noteJa || null);
    } else if (action === "assign" || action === "update") {
      const scope = action === "assign" ? "new" : String(placeId);
      const location = readText(fd, "location");
      const locationJa = readText(fd, "location_japanese");
      const order = Number(readText(fd, "sort_order") || "0");
      if (!Number.isInteger(placeId) || placeId <= 0) return fail(scope, `Choose a ${k.label.toLowerCase()}.`);
      if (location.length > 200 || locationJa.length > 200) return fail(scope, "The location must be 200 characters or less.");
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      const exists = result.assigned.some((a) => a.place_id === placeId);
      const known = exists || result.available.some((a) => a.id === placeId);
      if (!known || (action === "assign" && exists) || (action === "update" && !exists)) return result;
      await assignPlace(db, k, stationId, placeId, { location: location || null, locationJapanese: locationJa || null, sortOrder: order });
    } else if (action === "unassign") {
      await unassignPlace(db, k, stationId, placeId);
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/${k.route}#saved`;
  } catch (err) {
    console.error(`Failed to save station ${k.plural}:`, err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
