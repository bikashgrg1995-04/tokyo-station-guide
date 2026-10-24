import {
  createRestaurant,
  deleteRestaurant,
  getRestaurants,
  updateRestaurant,
  type Restaurant,
  type RestaurantInput,
} from "../db/station-restaurants";
import { getRestaurantsNote, saveRestaurantsNote } from "../db/station-restaurants";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

export interface RestaurantsResult {
  redirectTo: string | null;
  items: Restaurant[];
  note: string;
  noteJapanese: string;
  formError: string;
  /** "item-<id>" or "item-new" */
  errorFor: string;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleRestaurants(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<RestaurantsResult> {
  const result: RestaurantsResult = {
    redirectTo: null,
    items: await getRestaurants(db, stationId),
    ...(await getRestaurantsNote(db, stationId)),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "item_action");
  const id = Number(readText(fd, "item_id"));
  const existing = result.items.find((t) => t.id === id);
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.formError = message;
    return result;
  };

  try {
    const { env } = await import("cloudflare:workers");
    const bucket = iconBucket(env);

    if (action === "note_save") {
      const note = readText(fd, "restaurants_note");
      const noteJa = readText(fd, "restaurants_note_japanese");
      if (note.length > 1000 || noteJa.length > 1000) return fail("note", "The note must be 1000 characters or less.");
      await saveRestaurantsNote(db, stationId, note || null, noteJa || null);
    } else if (action === "item_delete") {
      if (existing) {
        await deleteRestaurant(db, stationId, id);
        await deleteStationImage(bucket, existing.photo);
      }
    } else if (action === "item_create" || action === "item_update") {
      const scope = action === "item_create" ? "item-new" : `item-${id}`;
      if (action === "item_update" && !existing) return result;

      const name = readText(fd, "name");
      const f = {
        nameJapanese: text(fd, "name_japanese", 150),
        kind: text(fd, "kind", 80),
        kindJapanese: text(fd, "kind_japanese", 80),
        location: text(fd, "location", 200),
        locationJapanese: text(fd, "location_japanese", 200),
        description: text(fd, "description", 800),
        descriptionJapanese: text(fd, "description_japanese", 800),
        mapUrl: text(fd, "map_url", 500),
      };
      const order = Number(readText(fd, "sort_order") || "0");

      if (!name) return fail(scope, "The name is required.");
      if (name.length > 150 || Object.values(f).some((x) => x && x.tooLong)) {
        return fail(scope, "A field is too long.");
      }
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (f.mapUrl.value) {
        let ok = false;
        try {
          const u = new URL(f.mapUrl.value);
          ok = u.protocol === "https:" || u.protocol === "http:";
        } catch {
          ok = false;
        }
        if (!ok) return fail(scope, "Links must be valid http(s) links.");
      }

      const file = readStationImageFile(fd, "photo_file");
      const check = file ? await checkStationImage(file) : null;
      if (check && !check.ok) return fail(scope, check.error);

      const input: RestaurantInput = {
        name,
        nameJapanese: f.nameJapanese.value,
        kind: f.kind.value,
        kindJapanese: f.kindJapanese.value,
        location: f.location.value,
        locationJapanese: f.locationJapanese.value,
        description: f.description.value,
        descriptionJapanese: f.descriptionJapanese.value,
        mapUrl: f.mapUrl.value,
        sortOrder: order,
      };

      let uploaded: string | null = null;
      if (check?.ok) {
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-restaurant`, check);
        input.photo = uploaded;
      } else if (action === "item_update" && fd.get("remove_photo") === "on") {
        input.photo = null;
      }

      try {
        if (action === "item_create") await createRestaurant(db, stationId, input);
        else {
          await updateRestaurant(db, stationId, id, input);
          if (input.photo !== undefined) await deleteStationImage(bucket, existing?.photo);
        }
      } catch (err) {
        await deleteStationImage(bucket, uploaded);
        throw err;
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/restaurants#saved`;
  } catch (err) {
    console.error("Failed to save restaurants:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
