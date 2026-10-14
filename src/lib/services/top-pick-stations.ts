import {
  removeTopPickStationAssignment,
  saveTopPickStationAssignment,
  type SaveTopPickStationAssignmentInput,
} from "../db/top-pick-stations";

import { readText } from "./common";

export interface TopPickStationFormResult {
  redirectTo: string | null;
  error: string;
}

export async function handleTopPickStationAssignment(
  request: Request,
  db: D1Database,
  topPickId: number,
): Promise<TopPickStationFormResult> {
  const result: TopPickStationFormResult = {
    redirectTo: null,
    error: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  const formData = await request.formData();
  const action = readText(formData, "action");
  const stationId = Number(readText(formData, "station_id"));

  if (!Number.isInteger(stationId) || stationId <= 0) {
    result.error = "Please select a valid station.";
    return result;
  }

  try {
    if (action === "remove") {
      await removeTopPickStationAssignment(db, topPickId, stationId);
    } else if (action === "save") {
      const rawFloorId = readText(formData, "floor_id");
      const rawExitId = readText(formData, "exit_id");
      const rawWalkingMinutes = readText(formData, "walking_minutes");
      const rawSortOrder = readText(formData, "sort_order");
      const locationType = readText(formData, "location_type");

      const floorId = rawFloorId ? Number(rawFloorId) : null;
      const exitId = rawExitId ? Number(rawExitId) : null;
      const walkingMinutes = rawWalkingMinutes
        ? Number(rawWalkingMinutes)
        : null;
      const sortOrder = rawSortOrder ? Number(rawSortOrder) : 0;

      if (
        (floorId !== null && (!Number.isInteger(floorId) || floorId <= 0)) ||
        (exitId !== null && (!Number.isInteger(exitId) || exitId <= 0))
      ) {
        result.error = "Please select a valid floor and exit.";
        return result;
      }

      if (
        walkingMinutes !== null &&
        (!Number.isInteger(walkingMinutes) || walkingMinutes < 0)
      ) {
        result.error = "Walking time must be a non-negative whole number.";
        return result;
      }

      if (!Number.isInteger(sortOrder)) {
        result.error = "Sort order must be a whole number.";
        return result;
      }

      if (
        locationType !== "inside" &&
        locationType !== "connected" &&
        locationType !== "outside"
      ) {
        result.error = "Please select a valid location type.";
        return result;
      }

      const input: SaveTopPickStationAssignmentInput = {
        stationId,
        floorId,
        exitId,
        walkingMinutes,
        sortOrder,
        locationType,
      };

      await saveTopPickStationAssignment(db, topPickId, input);
    } else {
      result.error = "Invalid assignment action.";
      return result;
    }

    result.redirectTo = `/admin/top-picks/${topPickId}/stations?success=${action}`;
  } catch (error) {
    console.error("Failed to save Top Pick station assignment:", error);
    result.error =
      error instanceof Error
        ? error.message
        : "Unable to update the station assignment.";
  }

  return result;
}