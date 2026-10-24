import {
  createThing,
  deleteThing,
  getThings,
  updateThing,
  type Thing,
  type ThingInput,
} from "../db/station-things";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

export interface ThingsResult {
  redirectTo: string | null;
  things: Thing[];
  formError: string;
  /** "thing-<id>" or "thing-new" */
  errorFor: string;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleThings(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<ThingsResult> {
  const result: ThingsResult = {
    redirectTo: null,
    things: await getThings(db, stationId),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "trip_action");
  const id = Number(readText(fd, "item_id"));
  const existing = result.things.find((t) => t.id === id);
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.formError = message;
    return result;
  };

  try {
    const { env } = await import("cloudflare:workers");
    const bucket = iconBucket(env);

    if (action === "trip_delete") {
      if (existing) {
        await deleteThing(db, stationId, id);
        await deleteStationImage(bucket, existing.photo);
      }
    } else if (action === "trip_create" || action === "trip_update") {
      const scope = action === "trip_create" ? "thing-new" : `thing-${id}`;
      if (action === "trip_update" && !existing) return result;

      const name = readText(fd, "name");
      const f = {
        nameJa: text(fd, "name_japanese", 150),
        kind: text(fd, "kind", 60),
        kindJa: text(fd, "kind_japanese", 60),
        location: text(fd, "location", 150),
        locationJa: text(fd, "location_japanese", 150),
        cost: text(fd, "cost", 100),
        costJa: text(fd, "cost_japanese", 100),
        desc: text(fd, "description", 800),
        descJa: text(fd, "description_japanese", 800),
        map: text(fd, "map_url", 500),
      };
      const order = Number(readText(fd, "sort_order") || "0");

      if (!name) return fail(scope, "The name is required.");
      if (name.length > 150 || Object.values(f).some((x) => x.tooLong)) {
        return fail(scope, "A field is too long (name 150, kind 60, location 150, cost 100, text 800, map link 500).");
      }
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (f.map.value) {
        let ok = false;
        try {
          const u = new URL(f.map.value);
          ok = u.protocol === "https:" || u.protocol === "http:";
        } catch {
          ok = false;
        }
        if (!ok) return fail(scope, "The map link must be a valid http(s) link.");
      }

      const file = readStationImageFile(fd, "photo_file");
      const check = file ? await checkStationImage(file) : null;
      if (check && !check.ok) return fail(scope, check.error);

      const input: ThingInput = {
        name,
        nameJapanese: f.nameJa.value,
        kind: f.kind.value,
        kindJapanese: f.kindJa.value,
        location: f.location.value,
        locationJapanese: f.locationJa.value,
        cost: f.cost.value,
        costJapanese: f.costJa.value,
        description: f.desc.value,
        descriptionJapanese: f.descJa.value,
        mapUrl: f.map.value,
        sortOrder: order,
      };

      let uploaded: string | null = null;
      if (check?.ok) {
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-thing`, check);
        input.photo = uploaded;
      } else if (action === "trip_update" && fd.get("remove_photo") === "on") {
        input.photo = null;
      }

      try {
        if (action === "trip_create") await createThing(db, stationId, input);
        else {
          await updateThing(db, stationId, id, input);
          if (input.photo !== undefined) await deleteStationImage(bucket, existing?.photo);
        }
      } catch (err) {
        await deleteStationImage(bucket, uploaded);
        throw err;
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/things-to-do#saved`;
  } catch (err) {
    console.error("Failed to save things to do:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
