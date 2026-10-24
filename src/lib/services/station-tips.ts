import {
  createExitPhoto,
  createStationTip,
  deleteExitPhoto,
  deleteStationTip,
  getExitPhotos,
  getExitsNote,
  getStationTips,
  saveExitsNote,
  updateExitPhoto,
  updateStationTip,
  type ExitPhoto,
  type StationTip,
} from "../db/station-tips";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";
import { readText } from "./common";

export interface StationTipsResult {
  redirectTo: string | null;
  photos: ExitPhoto[];
  tips: StationTip[];
  note: string;
  noteJapanese: string;
  formError: string;
  /** Which form the error belongs to: "photo-<id>", "photo-new", "tip-<id>", "tip-new" or "note". */
  errorFor: string;
}

const text = (fd: FormData, key: string) => readText(fd, key) || null;
const tooLong = (v: string | null, max: number) => (v ?? "").length > max;

export async function handleStationTips(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<StationTipsResult> {
  const result: StationTipsResult = {
    redirectTo: null,
    photos: await getExitPhotos(db, stationId),
    tips: await getStationTips(db, stationId),
    ...(await getExitsNote(db, stationId)),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "tips_action");
  const id = Number(readText(fd, "item_id"));
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.formError = message;
    return result;
  };
  const order = Number(readText(fd, "sort_order") || "0");
  const orderOk = Number.isInteger(order) && order >= 0;
  let uploaded: string | null = null;
  let bucket: R2Bucket | undefined;

  try {
    if (action === "save_note") {
      const note = readText(fd, "exits_note");
      const noteJa = readText(fd, "exits_note_japanese");
      if (note.length > 1000 || noteJa.length > 1000) return fail("note", "The note must be 1000 characters or less.");
      await saveExitsNote(db, stationId, note || null, noteJa || null);
    } else if (action === "tip_create" || action === "tip_update") {
      const tip = readText(fd, "tip");
      const tipJa = text(fd, "tip_japanese");
      const scope = action === "tip_create" ? "tip-new" : `tip-${id}`;
      if (!tip) return fail(scope, "The tip text is required.");
      if (tip.length > 600 || tooLong(tipJa, 600)) return fail(scope, "A tip must be 600 characters or less.");
      if (!orderOk) return fail(scope, "Order must be a whole number, 0 or more.");
      const input = { tip, tipJapanese: tipJa, sortOrder: order };
      if (action === "tip_create") await createStationTip(db, stationId, input);
      else if (result.tips.some((t) => t.id === id)) await updateStationTip(db, stationId, id, input);
    } else if (action === "tip_delete") {
      if (result.tips.some((t) => t.id === id)) await deleteStationTip(db, stationId, id);
    } else if (action === "photo_create" || action === "photo_update") {
      const scope = action === "photo_create" ? "photo-new" : `photo-${id}`;
      const title = readText(fd, "title");
      const input = {
        title,
        titleJapanese: text(fd, "title_japanese"),
        caption: text(fd, "caption"),
        captionJapanese: text(fd, "caption_japanese"),
        sortOrder: order,
      };
      if (!title) return fail(scope, "Title is required.");
      if (title.length > 80 || tooLong(input.titleJapanese, 80)) return fail(scope, "Title must be 80 characters or less.");
      if (tooLong(input.caption, 400) || tooLong(input.captionJapanese, 400)) return fail(scope, "Caption must be 400 characters or less.");
      if (!orderOk) return fail(scope, "Order must be a whole number, 0 or more.");

      const file = readStationImageFile(fd, "photo_file");
      const check = file ? await checkStationImage(file) : null;
      if (check && !check.ok) return fail(scope, check.error);
      if (check?.ok) {
        const { env } = await import("cloudflare:workers");
        bucket = iconBucket(env);
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-exit`, check);
      }

      if (action === "photo_create") {
        if (!uploaded) return fail(scope, "Choose a photo to upload.");
        await createExitPhoto(db, stationId, input, uploaded);
      } else {
        const current = result.photos.find((p) => p.id === id);
        if (current) {
          const remove = fd.get("remove_photo") === "on";
          await updateExitPhoto(db, stationId, id, input, uploaded ?? (remove ? null : undefined));
          if (uploaded || remove) {
            const { env } = await import("cloudflare:workers");
            await deleteStationImage(iconBucket(env), current.image);
          }
        }
      }
      uploaded = null;
    } else if (action === "photo_delete") {
      const current = result.photos.find((p) => p.id === id);
      if (current) {
        await deleteExitPhoto(db, stationId, id);
        const { env } = await import("cloudflare:workers");
        await deleteStationImage(iconBucket(env), current.image);
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/tips#saved`;
  } catch (err) {
    console.error("Failed to save station tips:", err);
    if (uploaded && bucket) await deleteStationImage(bucket, uploaded);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
