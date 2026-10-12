
export interface StationFloorFormValues {
  name: string;
  nameJapanese: string;
  floorOrder: string;
}

export type StationFloorFormErrors = Record<
  keyof StationFloorFormValues,
  string
>;

export function emptyStationFloorErrors(): StationFloorFormErrors {
  return {
    name: "",
    nameJapanese: "",
    floorOrder: "",
  };
}

export function validateStationFloorForm(
  values: StationFloorFormValues,
): StationFloorFormErrors {
  const errors = emptyStationFloorErrors();
  const floorOrder = Number(values.floorOrder);

  if (!values.name.trim()) {
    errors.name = "Floor name is required.";
  } else if (values.name.trim().length > 100) {
    errors.name = "Floor name must be 100 characters or less.";
  }

  if (values.nameJapanese.trim().length > 100) {
    errors.nameJapanese =
      "Japanese floor name must be 100 characters or less.";
  }

  if (
    values.floorOrder.trim() === "" ||
    !Number.isInteger(floorOrder) ||
    floorOrder < 0
  ) {
    errors.floorOrder =
      "Sort order must be a non-negative whole number.";
  }

  return errors;
}
