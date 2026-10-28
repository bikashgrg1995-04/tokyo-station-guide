import { getStationSights, getUnlinkedSights, linkSight, unlinkSight, type StationSight } from "../db/station-sights";
import { getStationExits } from "../db/station-exits";
import { readText } from "./common";

export interface SightsResult {
  redirectTo: string | null;
  sights: StationSight[];
  unlinked: { id: number; name: string; category: string }[];
  exits: { id: number; name: string }[];
  formError: string;
  errorFor: string;
  posted: Record<string, string> | null;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleSights(request: Request, db: D1Database, stationId: number): Promise<SightsResult> {
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
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k === "trip_action") continue;
    // Several checkboxes with the same name (other exits) come back as one comma list.
    posted[k] = k === "extra_exits" && posted[k] ? `${posted[k]},${v}` : v;
  }
  const existing = result.sights.find((t) => t.top_pick_id === id);
  const fail = (scope: string, message: string) => {
    result.errorFor = scope; result.posted = posted; result.formError = message; return result;
  };

  try {
    if (action === "trip_delete") {
      if (existing) await unlinkSight(db, stationId, id); // the place stays in Places
    } else if (action === "trip_create" || action === "trip_update") {
      const scope = action === "trip_create" ? "thing-new" : `thing-${id}`;
      if (action === "trip_update" && !existing) return result;

      // Place details (name, photo, description...) live in Places; here only what is true for this station.
      const pickId = action === "trip_create" ? Number(readText(fd, "existing_id") || "0") : id;
      const order = Number(readText(fd, "sort_order") || "0");
      const exitId = Number(readText(fd, "exit_id") || "0") || null;
      const minRaw = readText(fd, "walking_minutes");
      const minutes = minRaw === "" ? null : Number(minRaw);
      const loc = text(fd, "location", 150), locJa = text(fd, "location_japanese", 150);
      const lt = readText(fd, "location_type"); const locType = lt === "outside" || lt === "inside_outside" ? lt : "inside";
      const on = (k: string) => fd.get(k) === "on";

      const topText = text(fd, "top_text", 600), topTextJa = text(fd, "top_text_japanese", 600);
      const topCap = text(fd, "top_caption", 200), topCapJa = text(fd, "top_caption_japanese", 200);
      const thText = text(fd, "thing_text", 1000), thTextJa = text(fd, "thing_text_japanese", 1000);
      const thCap = text(fd, "thing_caption", 200), thCapJa = text(fd, "thing_caption_japanese", 200);
      const exNote = text(fd, "exit_note", 200), exNoteJa = text(fd, "exit_note_japanese", 200);
      const trTime = text(fd, "travel_time", 80), trTimeJa = text(fd, "travel_time_japanese", 80);
      const trBy = text(fd, "transport", 150), trByJa = text(fd, "transport_japanese", 150);
      const extraIds = fd.getAll("extra_exits").flatMap((v) => String(v).split(",")).map(Number).filter((n) => n > 0);

      if (!(pickId > 0)) return fail(scope, "Choose a place from the list. Not there? Add it under Places first.");
      if (action === "trip_create" && !result.unlinked.some((u) => u.id === pickId)) {
        return fail(scope, "That place is not available (already on this station?). Choose another.");
      }
      if (!on("is_top_pick") && !on("is_thing") && !on("is_which_exit") && !on("is_day_trip")) {
        return fail(scope, "Tick at least one place where it should show: Top pick, Thing to do, Which exit? or Day trip.");
      }
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 120)) {
        return fail(scope, "Walking minutes must be a whole number from 0 to 120.");
      }
      if (loc.tooLong || locJa.tooLong) return fail(scope, "The location note must be 150 characters or less.");
      if (topText.tooLong || topTextJa.tooLong) return fail(scope, "Top pick info must be 600 characters or less.");
      if (thText.tooLong || thTextJa.tooLong) return fail(scope, "Thing to do info must be 1000 characters or less.");
      if (topCap.tooLong || topCapJa.tooLong || thCap.tooLong || thCapJa.tooLong) return fail(scope, "An image caption must be 200 characters or less.");
      if (exNote.tooLong || exNoteJa.tooLong) return fail(scope, "The exit note must be 200 characters or less.");
      if (trTime.tooLong || trTimeJa.tooLong) return fail(scope, "Travel time must be 80 characters or less.");
      if (trBy.tooLong || trByJa.tooLong) return fail(scope, "Transport must be 150 characters or less.");
      if (exitId && !exits.some((e) => e.id === exitId)) return fail(scope, "Please choose an exit of this station.");
      if (extraIds.some((x) => !exits.some((e) => e.id === x))) return fail(scope, "Please choose exits of this station.");
      if (on("is_which_exit") && !exitId) return fail(scope, "Choose the exit: \"Which exit?\" needs an exit to point to.");

      await linkSight(db, stationId, pickId, {
        exitId, walkingMinutes: minutes, locationType: locType,
        location: loc.value, locationJapanese: locJa.value, sortOrder: order,
        top: { on: on("is_top_pick"), text: topText.value, textJa: topTextJa.value, caption: topCap.value, captionJa: topCapJa.value },
        thing: { on: on("is_thing"), text: thText.value, textJa: thTextJa.value, caption: thCap.value, captionJa: thCapJa.value },
        whichExit: { on: on("is_which_exit"), note: exNote.value, noteJa: exNoteJa.value, extraExitIds: extraIds },
        dayTrip: { on: on("is_day_trip"), travelTime: trTime.value, travelTimeJa: trTimeJa.value, transport: trBy.value, transportJa: trByJa.value },
      });
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/edit?g=places`;
  } catch (err) {
    console.error("Failed to save places:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
