import { getFacilities, getStationFacilities, type Facility, type StationFacility } from "../db/facilities";
import {
  createFacilityEntry,
  deleteFacilityEntry,
  updateFacilityEntry,
  type FacilityEntryInput,
} from "../db/station-facility-entries";
import { getStationFloors, type StationFloor } from "../db/station-floors";
import { getStationExits } from "../db/station-exits";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

export interface FacilityEntriesResult {
  redirectTo: string | null;
  entries: StationFacility[];
  facilities: Facility[];
  floors: StationFloor[];
  exits: { id: number; name: string; name_japanese: string | null }[];
  formError: string;
  /** "fac-<id>" or "fac-new" */
  errorFor: string;
  posted: Record<string, string> | null;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleFacilityEntries(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<FacilityEntriesResult> {
  const [entries, facilities, floors, exitRows] = await Promise.all([
    getStationFacilities(db, stationId),
    getFacilities(db),
    getStationFloors(db, stationId),
    getStationExits(db, stationId),
  ]);
  const result: FacilityEntriesResult = {
    redirectTo: null,
    entries,
    facilities,
    floors,
    exits: exitRows.map((e) => ({ id: e.id, name: e.name, name_japanese: e.name_japanese ?? null })),
    formError: "",
    errorFor: "",
    posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "fac_action");
  const id = Number(readText(fd, "item_id"));
  const existing = entries.find((e) => e.id === id);
  const posted: Record<string, string> = { item_id: String(id || "") };
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k === "fac_action") continue;
    posted[k] = k in posted ? `${posted[k]},${v}` : v;
  }
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.posted = posted;
    result.formError = message;
    return result;
  };

  try {
    const { env } = await import("cloudflare:workers");
    const bucket = iconBucket(env);

    if (action === "fac_delete") {
      if (existing) {
        await deleteFacilityEntry(db, stationId, id);
        await deleteStationImage(bucket, existing.photo);
      }
    } else if (action === "fac_create" || action === "fac_update") {
      const scope = action === "fac_create" ? "fac-new" : `fac-${id}`;
      if (action === "fac_update" && !existing) return result;

      const facilityId = Number(readText(fd, "facility_id"));
      const floorId = Number(readText(fd, "floor_id"));
      const count = Number(readText(fd, "facility_count") || "1");
      const order = Number(readText(fd, "sort_order") || "0");
      const desc = text(fd, "note", 1500);
      const descJa = text(fd, "note_japanese", 1500);
      const cap = text(fd, "photo_caption", 400);
      const capJa = text(fd, "photo_caption_japanese", 400);
      const exitIds = fd.getAll("exit_ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);

      if (!facilities.some((f) => f.id === facilityId)) return fail(scope, "Choose a facility.");
      if (!floors.some((f) => f.id === floorId)) return fail(scope, "Choose a floor.");
      if (!Number.isInteger(count) || count < 1) return fail(scope, "Quantity must be a whole number, 1 or more.");
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (desc.tooLong || descJa.tooLong) return fail(scope, "The description must be 1500 characters or less.");
      if (cap.tooLong || capJa.tooLong) return fail(scope, "The photo caption must be 400 characters or less.");
      if (entries.some((e) => e.id !== id && e.facility_id === facilityId && e.floor_id === floorId)) {
        return fail(scope, "This facility is already listed on that floor. Edit that row instead.");
      }

      const file = readStationImageFile(fd, "photo_file");
      const check = file ? await checkStationImage(file) : null;
      if (check && !check.ok) return fail(scope, check.error);

      const input: FacilityEntryInput = {
        facilityId,
        floorId,
        count,
        description: desc.value,
        descriptionJapanese: descJa.value,
        locationType: ({ outside: "outside", inside_outside: "inside_outside" } as const)[readText(fd, "location_type") as "outside" | "inside_outside"] ?? "inside",
        exitIds,
        photoCaption: cap.value,
        photoCaptionJapanese: capJa.value,
        sortOrder: order,
      };

      let uploaded: string | null = null;
      if (check?.ok) {
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-facility`, check);
        input.photo = uploaded;
      } else if (action === "fac_update" && fd.get("remove_photo") === "on") {
        input.photo = null;
      }

      try {
        if (action === "fac_create") await createFacilityEntry(db, stationId, input);
        else {
          await updateFacilityEntry(db, stationId, id, input);
          if (input.photo !== undefined) await deleteStationImage(bucket, existing?.photo);
        }
      } catch (err) {
        await deleteStationImage(bucket, uploaded);
        throw err;
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/edit#facilities`;
  } catch (err) {
    console.error("Failed to save facility entry:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
