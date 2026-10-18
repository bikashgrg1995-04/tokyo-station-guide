export interface StationExitFormValues {
  floorId: string;
  name: string;
  nameJapanese: string;
  code: string;
  colorCode: string;
  description: string;
  descriptionJapanese: string;
  sortOrder: string;
}

export type StationExitFormErrors = Record<
  keyof StationExitFormValues,
  string
>;

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function emptyStationExitErrors(): StationExitFormErrors {
  return {
    floorId: "",
    name: "",
    nameJapanese: "",
    code: "",
    colorCode: "",
    description: "",
    descriptionJapanese: "",
    sortOrder: "",
  };
}

export function validateStationExitForm(
  values: StationExitFormValues,
): StationExitFormErrors {
  const errors = emptyStationExitErrors();

  const floorId = Number(values.floorId);
  const sortOrder = Number(values.sortOrder);

  if (!Number.isInteger(floorId) || floorId <= 0) {
    errors.floorId = "Select a floor.";
  }

  if (!values.name.trim()) {
    errors.name = "Exit name is required.";
  } else if (values.name.trim().length > 150) {
    errors.name = "Exit name must be 150 characters or less.";
  }

  if (values.nameJapanese.trim().length > 150) {
    errors.nameJapanese = "Japanese name must be 150 characters or less.";
  }

  if (values.code.trim().length > 50) {
    errors.code = "Exit code must be 50 characters or less.";
  }

  if (
    values.colorCode.trim() &&
    !HEX_COLOR_REGEX.test(values.colorCode.trim())
  ) {
    errors.colorCode = "Color must be a HEX value such as #2563EB.";
  }

  if (values.description.trim().length > 500) {
    errors.description = "Description must be 500 characters or less.";
  }

  if (values.descriptionJapanese.trim().length > 500) {
    errors.descriptionJapanese =
      "Japanese description must be 500 characters or less.";
  }

  if (
    values.sortOrder.trim() === "" ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  ) {
    errors.sortOrder = "Sort order must be a non-negative whole number.";
  }

  return errors;
}
