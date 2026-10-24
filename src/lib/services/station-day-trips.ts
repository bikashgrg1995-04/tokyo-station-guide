import {
  createDayTrip,
  deleteDayTrip,
  getDayTrips,
  updateDayTrip,
  type DayTrip,
  type DayTripInput,
} from "../db/station-day-trips";
import { readText } from "./common";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

export interface DayTripsResult {
  redirectTo: string | null;
  trips: DayTrip[];
  formError: string;
  /** "trip-<id>" or "trip-new" */
  errorFor: string;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleDayTrips(
  request: Request,
  db: D1Database,
  stationId: number,
  stationSlug: string,
): Promise<DayTripsResult> {
  const result: DayTripsResult = {
    redirectTo: null,
    trips: await getDayTrips(db, stationId),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "trip_action");
  const id = Number(readText(fd, "item_id"));
  const existing = result.trips.find((t) => t.id === id);
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
        await deleteDayTrip(db, stationId, id);
        await deleteStationImage(bucket, existing.photo);
      }
    } else if (action === "trip_create" || action === "trip_update") {
      const scope = action === "trip_create" ? "trip-new" : `trip-${id}`;
      if (action === "trip_update" && !existing) return result;

      const name = readText(fd, "name");
      const f = {
        nameJa: text(fd, "name_japanese", 150),
        time: text(fd, "travel_time", 60),
        timeJa: text(fd, "travel_time_japanese", 60),
        transport: text(fd, "transport", 120),
        transportJa: text(fd, "transport_japanese", 120),
        desc: text(fd, "description", 600),
        descJa: text(fd, "description_japanese", 600),
        map: text(fd, "map_url", 500),
      };
      const order = Number(readText(fd, "sort_order") || "0");

      if (!name) return fail(scope, "The name is required.");
      if (name.length > 150 || Object.values(f).some((x) => x.tooLong)) {
        return fail(scope, "A field is too long (name 150, times 60, transport 120, text 600, map link 500).");
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

      const input: DayTripInput = {
        name,
        nameJapanese: f.nameJa.value,
        travelTime: f.time.value,
        travelTimeJapanese: f.timeJa.value,
        transport: f.transport.value,
        transportJapanese: f.transportJa.value,
        description: f.desc.value,
        descriptionJapanese: f.descJa.value,
        mapUrl: f.map.value,
        sortOrder: order,
      };

      let uploaded: string | null = null;
      if (check?.ok) {
        if (!bucket) return fail(scope, "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
        uploaded = await saveStationImage(bucket, `${stationSlug}-trip`, check);
        input.photo = uploaded;
      } else if (action === "trip_update" && fd.get("remove_photo") === "on") {
        input.photo = null;
      }

      try {
        if (action === "trip_create") await createDayTrip(db, stationId, input);
        else {
          await updateDayTrip(db, stationId, id, input);
          if (input.photo !== undefined) await deleteStationImage(bucket, existing?.photo);
        }
      } catch (err) {
        await deleteStationImage(bucket, uploaded);
        throw err;
      }
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/day-trips#saved`;
  } catch (err) {
    console.error("Failed to save day trips:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
