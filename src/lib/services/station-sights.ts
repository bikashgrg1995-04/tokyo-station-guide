import {
  createSight, getStationSights, getUnlinkedSights, linkSight, unlinkSight, updateSight,
  type SightFields, type StationSight,
} from "../db/station-sights";
import { getStationExits } from "../db/station-exits";
import { TOP_PICK_CATEGORIES } from "../db/top-picks";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage, deleteStationImage, readStationImageFile, saveStationImage,
} from "../storage/station-images";

export interface SightsResult {
  redirectTo: string | null;
  sights: StationSight[];
  unlinked: { id: number; name: string }[];
  exits: { id: number; name: string }[];
  formError: string;
  errorFor: string;
  posted: Record<string, string> | null;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleSights(
  request: Request, db: D1Database, stationId: number, stationSlug: string,
): Promise<SightsResult> {
  const exits = (await getStationExits(db, stationId)).map((e) => ({ id: e.id, name: e.name }));
  const result: SightsResult = {
    redirectTo: null, sights: await getStationSights(db, stationId),
    unlinked: await getUnlinkedSights(db, stationId), exits, formError: "", errorFor: "", posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "trip_action");
  const id = Number(readText(fd, "item_id"));
  const posted: Record<string, string> = { item_id: String(id || "") };
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "trip_action") posted[k] = v;
  const existing = result.sights.find((t) => t.top_pick_id === id);
  const fail = (scope: string, message: string) => {
    result.errorFor = scope; result.posted = posted; result.formError = message; return result;
  };

  try {
    const { env } = await import("cloudflare:workers");
    const bucket = iconBucket(env);

    if (action === "trip_delete") {
      if (existing) await unlinkSight(db, stationId, id); // the place stays in the Top picks list
    } else if (action === "trip_create" || action === "trip_update") {
      const scope = action === "trip_create" ? "thing-new" : `thing-${id}`;
      if (action === "trip_update" && !existing) return result;

      const pickId = Number(readText(fd, "existing_id") || "0");
      const useExisting = action === "trip_create" && pickId > 0;
      const order = Number(readText(fd, "sort_order") || "0");
      const exitId = Number(readText(fd, "exit_id") || "0") || null;
      const minRaw = readText(fd, "walking_minutes");
      const minutes = minRaw === "" ? null : Number(minRaw);
      const loc = text(fd, "location", 150), locJa = text(fd, "location_japanese", 150);
      const lt = readText(fd, "location_type"); const locType = lt === "outside" || lt === "inside_outside" ? lt : "inside";

      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 120)) {
        return fail(scope, "Walking minutes must be a whole number from 0 to 120.");
      }
      if (loc.tooLong || locJa.tooLong) return fail(scope, "The location must be 150 characters or less.");
      if (exitId && !exits.some((e) => e.id === exitId)) return fail(scope, "Please choose an exit of this station.");

      const link = {
        exitId, walkingMinutes: minutes, locationType: locType,
        location: loc.value, locationJapanese: locJa.value, sortOrder: order,
      };

      if (useExisting) {
        await linkSight(db, stationId, pickId, link);
      } else {
        const name = readText(fd, "name");
        const f = {
          nameJa: text(fd, "name_japanese", 150), kind: text(fd, "kind", 60), kindJa: text(fd, "kind_japanese", 60),
          cost: text(fd, "cost", 100), costJa: text(fd, "cost_japanese", 100),
          desc: text(fd, "description", 800), descJa: text(fd, "description_japanese", 800), map: text(fd, "map_url", 500),
        };
        if (!name) return fail(scope, "Choose an existing place or type a name.");
        if (name.length > 150 || Object.values(f).some((x) => x.tooLong)) {
          return fail(scope, "A field is too long (name 150, kind 60, cost 100, text 800, map link 500).");
        }
        if (f.map.value) {
          let ok = false;
          try { const u = new URL(f.map.value); ok = u.protocol === "https:" || u.protocol === "http:"; } catch { ok = false; }
          if (!ok) return fail(scope, "The map link must be a valid http(s) link.");
        }
        const cat = readText(fd, "category");
        const category = (TOP_PICK_CATEGORIES as readonly string[]).includes(cat) ? cat : (existing?.category ?? "landmark");

        const file = readStationImageFile(fd, "photo_file");
        const check = file ? await checkStationImage(file) : null;
        if (check && !check.ok) return fail(scope, check.error);

        const fields: SightFields = {
          name, nameJapanese: f.nameJa.value, kind: f.kind.value, kindJapanese: f.kindJa.value, category,
          entryFee: f.cost.value, entryFeeJapanese: f.costJa.value, description: f.desc.value,
          descriptionJapanese: f.descJa.value, mapUrl: f.map.value,
        };
        let uploaded: string | null = null;
        if (check?.ok) {
          if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
          uploaded = await saveStationImage(bucket, `${stationSlug}-thing`, check);
          fields.image = uploaded;
        } else if (action === "trip_update" && fd.get("remove_photo") === "on") {
          fields.image = null;
        }
        try {
          if (action === "trip_create") {
            const newId = await createSight(db, fields);
            await linkSight(db, stationId, newId, link);
          } else {
            await updateSight(db, id, fields);
            await linkSight(db, stationId, id, link);
            if (fields.image !== undefined) await deleteStationImage(bucket, existing?.image_url);
          }
        } catch (err) {
          await deleteStationImage(bucket, uploaded);
          throw err;
        }
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/things-to-do#saved`;
  } catch (err) {
    console.error("Failed to save sights:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
