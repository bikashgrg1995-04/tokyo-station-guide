import {
  createLine,
  getLinesPaginated,
  updateLine,
  type Line,
} from "../db/lines";
import {
  addStationToLine,
  getAvailableStationsForLine,
  getStationsForLine,
  removeStationFromLine,
  updateLineStation,
} from "../db/line-stations";
import type { Operator } from "../db/operators";
import {
  errorMessage,
  hasErrors,
  isUniqueViolation,
  paginationUrlFor,
  readListQuery,
  readText,
} from "./common";

const LIST_PATH = "/admin/lines";
const PER_PAGE = 10;

export interface LineFormValues {
  operatorId: string;
  name: string;
  slug: string;
  code: string;
  color: string;
  description: string;
}

export type LineFormErrors = Record<keyof LineFormValues, string>;

export interface LineFormResult {
  /** Set when the page should redirect (form saved). */
  redirectTo: string | null;
  values: LineFormValues;
  errors: LineFormErrors;
  formError: string;
}

/* ========================================
   Form
======================================== */

function emptyErrors(): LineFormErrors {
  return {
    operatorId: "",
    name: "",
    slug: "",
    code: "",
    color: "",
    description: "",
  };
}

function readLineForm(formData: FormData): LineFormValues {
  return {
    operatorId: readText(formData, "operator_id"),
    name: readText(formData, "name"),
    slug: readText(formData, "slug"),
    code: readText(formData, "code"),
    color: readText(formData, "color"),
    description: readText(formData, "description"),
  };
}

export function validateLineForm(
  values: LineFormValues,
  operators: Operator[],
): LineFormErrors {
  const { operatorId, name, slug, code, color, description } = values;
  const errors = emptyErrors();

  const parsedOperatorId = Number(operatorId);

  if (!operatorId) {
    errors.operatorId = "Operator is required.";
  } else if (!Number.isInteger(parsedOperatorId) || parsedOperatorId <= 0) {
    errors.operatorId = "Please select a valid operator.";
  } else if (!operators.some((operator) => operator.id === parsedOperatorId)) {
    errors.operatorId = "Selected operator does not exist.";
  }

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > 150) {
    errors.name = "Name must be 150 characters or less.";
  }

  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  } else if (slug.length > 150) {
    errors.slug = "Slug must be 150 characters or less.";
  }

  if (code.length > 50) {
    errors.code = "Code must be 50 characters or less.";
  }

  if (color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      errors.color = "Color must be a valid hex color, such as #00A650.";
    }
  }

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  return errors;
}

/** Turns a database error into field errors; returns the general form error. */
function describeSaveError(
  err: unknown,
  action: "create" | "update",
  errors: LineFormErrors,
): string {
  console.error(err);

  const message = errorMessage(err);

  if (isUniqueViolation(message, "lines.slug")) {
    errors.slug = "A line with this slug already exists.";
    return "";
  }

  if (isUniqueViolation(message, "lines.code")) {
    errors.code = "A line with this code already exists.";
    return "";
  }

  return `Unable to ${action} line because of an unexpected database error.`;
}

async function submitLineForm(
  request: Request,
  result: LineFormResult,
  operators: Operator[],
  action: "create" | "update",
  save: (values: LineFormValues, operatorId: number) => Promise<void>,
): Promise<LineFormResult> {
  const values = readLineForm(await request.formData());

  result.values = values;
  result.errors = validateLineForm(values, operators);

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    await save(values, Number(values.operatorId));

    result.redirectTo = LIST_PATH;
  } catch (err) {
    result.formError = describeSaveError(err, action, result.errors);
  }

  return result;
}

/** "New line" page: shows the form, saves it on POST. */
export async function handleLineCreate(
  request: Request,
  db: D1Database,
  operators: Operator[],
): Promise<LineFormResult> {
  const result: LineFormResult = {
    redirectTo: null,
    values: {
      operatorId: "",
      name: "",
      slug: "",
      code: "",
      color: "",
      description: "",
    },
    errors: emptyErrors(),
    formError: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  return submitLineForm(
    request,
    result,
    operators,
    "create",
    async (values, operatorId) => {
      await createLine(db, {
        operatorId,
        name: values.name,
        slug: values.slug,
        code: values.code || null,
        description: values.description || null,
        color: values.color || null,
      });
    },
  );
}

/** "Edit line" page: starts from the stored line, saves on POST. */
export async function handleLineUpdate(
  request: Request,
  db: D1Database,
  id: number,
  line: Line | null,
  operators: Operator[],
): Promise<LineFormResult> {
  const result: LineFormResult = {
    redirectTo: null,
    values: {
      operatorId: line?.operator_id ? String(line.operator_id) : "",
      name: line?.name ?? "",
      slug: line?.slug ?? "",
      code: line?.code ?? "",
      color: line?.color ?? "",
      description: line?.description ?? "",
    },
    errors: emptyErrors(),
    formError: "",
  };

  if (!line || request.method !== "POST") {
    return result;
  }

  return submitLineForm(
    request,
    result,
    operators,
    "update",
    async (values, operatorId) => {
      await updateLine(db, id, {
        operatorId,
        name: values.name,
        slug: values.slug,
        code: values.code || null,
        color: values.color || null,
        description: values.description || null,
      });
    },
  );
}

/* ========================================
   List
======================================== */

/** Lines list page: search, pagination and the pagination URL. */
export async function loadLineList(db: D1Database, url: URL) {
  const { search, page } = readListQuery(url);

  const { items, totalItems, currentPage, totalPages } =
    await getLinesPaginated(db, {
      page,
      perPage: PER_PAGE,
      search,
    });

  return {
    lines: items,
    totalItems,
    currentPage,
    totalPages,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(LIST_PATH, url, search),
  };
}

/* ========================================
   Stations of a line
======================================== */

export interface LineStationsActionResult {
  /** Set when the page should redirect (change saved). */
  redirectTo: string | null;
  error: string;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Handles the add / update / remove forms of the "line stations" page. */
export async function handleLineStationsAction(
  request: Request,
  db: D1Database,
  lineId: number,
): Promise<LineStationsActionResult> {
  const result: LineStationsActionResult = { redirectTo: null, error: "" };

  if (request.method !== "POST") {
    return result;
  }

  const formData = await request.formData();

  const action = String(formData.get("action") ?? "");

  const stationsPath = `${LIST_PATH}/${lineId}/stations`;

  try {
    if (action === "add") {
      const stationId = Number(formData.get("station_id") ?? 0);
      const stationOrder = Number(formData.get("station_order") ?? 0);
      const stationCode = String(formData.get("station_code") ?? "").trim();

      if (!isPositiveInteger(stationId)) {
        result.error = "Please select a station.";
      } else if (!isPositiveInteger(stationOrder)) {
        result.error = "Station order must be a positive whole number.";
      } else if (stationCode.length > 50) {
        result.error = "Station code must be 50 characters or less.";
      } else {
        await addStationToLine(
          db,
          lineId,
          stationId,
          stationOrder,
          stationCode || null,
        );

        result.redirectTo = stationsPath;
      }
    } else if (action === "update") {
      const id = Number(formData.get("id") ?? 0);
      const stationOrder = Number(formData.get("station_order") ?? 0);
      const stationCode = String(formData.get("station_code") ?? "").trim();

      if (!isPositiveInteger(id)) {
        result.error = "Invalid line station.";
      } else if (!isPositiveInteger(stationOrder)) {
        result.error = "Station order must be a positive whole number.";
      } else if (stationCode.length > 50) {
        result.error = "Station code must be 50 characters or less.";
      } else {
        await updateLineStation(db, id, stationOrder, stationCode || null);

        result.redirectTo = stationsPath;
      }
    } else if (action === "remove") {
      const id = Number(formData.get("id") ?? 0);

      if (!isPositiveInteger(id)) {
        result.error = "Invalid station.";
      } else {
        await removeStationFromLine(db, id);

        result.redirectTo = stationsPath;
      }
    }
  } catch (err) {
    console.error(err);

    const message = errorMessage(err);

    if (message.includes("unique") || message.includes("constraint")) {
      result.error =
        "Unable to update this line's stations. The station order may already be in use, or the station may already be connected to this line.";
    } else {
      result.error =
        "Unable to update this line's stations because of an unexpected database error.";
    }
  }

  return result;
}

/** Stations of a line (filtered by search) and the stations that can still be added. */
export async function loadLineStations(
  db: D1Database,
  lineId: number,
  search: string,
) {
  const stations = await getStationsForLine(db, lineId, search);
  const availableStations = await getAvailableStationsForLine(db, lineId);

  return { stations, availableStations };
}
