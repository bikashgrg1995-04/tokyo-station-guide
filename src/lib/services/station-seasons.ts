import { getStationSeasons, saveStationSeason, SEASONS, type Season, type StationSeason } from "../db/station-seasons";
import { readText } from "./common";

export interface StationSeasonsResult {
  redirectTo: string | null;
  seasons: Record<Season, StationSeason | undefined>;
  formError: string;
  errorFor: string;
  posted: Record<string, string> | null;
}

const text = (fd: FormData, key: string) => readText(fd, key) || null;

export async function handleStationSeasons(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationSeasonsResult> {
  const load = async () => {
    const rows = await getStationSeasons(db, stationId);
    return Object.fromEntries(SEASONS.map((s) => [s, rows.find((r) => r.season === s)])) as StationSeasonsResult["seasons"];
  };
  const result: StationSeasonsResult = { redirectTo: null, seasons: await load(), formError: "", errorFor: "", posted: null };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const season = readText(fd, "season") as Season;
  const posted: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") posted[k] = v;
  if (!SEASONS.includes(season)) return result;

  const months = text(fd, "months");
  const monthsJa = text(fd, "months_japanese");
  const desc = text(fd, "description");
  const descJa = text(fd, "description_japanese");
  const fail = (m: string) => {
    result.errorFor = season;
    result.posted = posted;
    result.formError = m;
    return result;
  };
  if ((months ?? "").length > 40 || (monthsJa ?? "").length > 40) return fail("Months must be 40 characters or less.");
  if ((desc ?? "").length > 600 || (descJa ?? "").length > 600) return fail("The text must be 600 characters or less.");

  try {
    await saveStationSeason(db, stationId, season, { months, monthsJa, desc, descJa });
    result.redirectTo = `/admin/stations/${stationId}/seasons#saved`;
  } catch (err) {
    console.error("Failed to save station season:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
