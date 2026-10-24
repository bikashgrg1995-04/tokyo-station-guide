import {
  createTransport,
  deleteTransport,
  getTransport,
  updateTransport,
  type TransportItem,
  type TransportInput,
} from "../db/station-transport";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

export interface TransportResult {
  redirectTo: string | null;
  items: TransportItem[];
  formError: string;
  /** "item-<id>" or "item-new" */
  errorFor: string;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleTransport(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<TransportResult> {
  const result: TransportResult = {
    redirectTo: null,
    items: await getTransport(db, stationId),
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
        await deleteTransport(db, stationId, id);
        await deleteStationImage(bucket, existing.photo);
      }
    } else if (action === "guide_create" || action === "guide_update") {
      const scope = action === "guide_create" ? "item-new" : `item-${id}`;
      if (action === "guide_update" && !existing) return result;

      const place = readText(fd, "place");
      const f = {
        placeJa: text(fd, "place_japanese", 150),
        service: text(fd, "service", 400),
        serviceJa: text(fd, "service_japanese", 400),
        notes: text(fd, "notes", 800),
        notesJa: text(fd, "notes_japanese", 800),
        title: text(fd, "photo_title", 150),
        titleJa: text(fd, "photo_title_japanese", 150),
        cap: text(fd, "photo_caption", 400),
        capJa: text(fd, "photo_caption_japanese", 400),
      };
      const order = Number(readText(fd, "sort_order") || "0");

      if (!place) return fail(scope, "\"Where\" is required.");
      if (place.length > 150 || Object.values(f).some((x) => x.tooLong)) {
        return fail(scope, "A field is too long (where 150, service 400, notes 800, photo title 150, photo caption 400).");
      }
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");

      const file = readStationImageFile(fd, "photo_file");
      const check = file ? await checkStationImage(file) : null;
      if (check && !check.ok) return fail(scope, check.error);

      const input: TransportInput = {
        place,
        placeJapanese: f.placeJa.value,
        service: f.service.value,
        serviceJapanese: f.serviceJa.value,
        notes: f.notes.value,
        notesJapanese: f.notesJa.value,
        photoTitle: f.title.value,
        photoTitleJapanese: f.titleJa.value,
        photoCaption: f.cap.value,
        photoCaptionJapanese: f.capJa.value,
        sortOrder: order,
      };

      let uploaded: string | null = null;
      if (check?.ok) {
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-transport`, check);
        input.photo = uploaded;
      } else if (action === "guide_update" && fd.get("remove_photo") === "on") {
        input.photo = null;
      }

      try {
        if (action === "guide_create") await createTransport(db, stationId, input);
        else {
          await updateTransport(db, stationId, id, input);
          if (input.photo !== undefined) await deleteStationImage(bucket, existing?.photo);
        }
      } catch (err) {
        await deleteStationImage(bucket, uploaded);
        throw err;
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/buses-taxis#saved`;
  } catch (err) {
    console.error("Failed to save buses & taxis:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
