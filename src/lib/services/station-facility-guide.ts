import {
  createFacilityGuideItem,
  deleteFacilityGuideItem,
  getFacilityGuide,
  updateFacilityGuideItem,
  type FacilityGuideItem,
  type FacilityGuideInput,
} from "../db/station-facility-guide";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

export interface FacilityGuideResult {
  redirectTo: string | null;
  items: FacilityGuideItem[];
  formError: string;
  /** "item-<id>" or "item-new" */
  errorFor: string;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleFacilityGuide(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<FacilityGuideResult> {
  const result: FacilityGuideResult = {
    redirectTo: null,
    items: await getFacilityGuide(db, stationId),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "guide_action");
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

    if (action === "guide_delete") {
      if (existing) {
        await deleteFacilityGuideItem(db, stationId, id);
        await deleteStationImage(bucket, existing.photo);
      }
    } else if (action === "guide_create" || action === "guide_update") {
      const scope = action === "guide_create" ? "item-new" : `item-${id}`;
      if (action === "guide_update" && !existing) return result;

      const name = readText(fd, "name");
      const f = {
        nameJa: text(fd, "name_japanese", 150),
        desc: text(fd, "description", 1500),
        descJa: text(fd, "description_japanese", 1500),
        cap: text(fd, "photo_caption", 400),
        capJa: text(fd, "photo_caption_japanese", 400),
      };
      const order = Number(readText(fd, "sort_order") || "0");

      if (!name) return fail(scope, "The name is required.");
      if (name.length > 150 || Object.values(f).some((x) => x.tooLong)) {
        return fail(scope, "A field is too long (name 150, text 1500, photo caption 400).");
      }
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");

      const file = readStationImageFile(fd, "photo_file");
      const check = file ? await checkStationImage(file) : null;
      if (check && !check.ok) return fail(scope, check.error);

      const input: FacilityGuideInput = {
        name,
        nameJapanese: f.nameJa.value,
        description: f.desc.value,
        descriptionJapanese: f.descJa.value,
        photoCaption: f.cap.value,
        photoCaptionJapanese: f.capJa.value,
        sortOrder: order,
      };

      let uploaded: string | null = null;
      if (check?.ok) {
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-facility`, check);
        input.photo = uploaded;
      } else if (action === "guide_update" && fd.get("remove_photo") === "on") {
        input.photo = null;
      }

      try {
        if (action === "guide_create") await createFacilityGuideItem(db, stationId, input);
        else {
          await updateFacilityGuideItem(db, stationId, id, input);
          if (input.photo !== undefined) await deleteStationImage(bucket, existing?.photo);
        }
      } catch (err) {
        await deleteStationImage(bucket, uploaded);
        throw err;
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/facility-guide#saved`;
  } catch (err) {
    console.error("Failed to save facility guide:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
