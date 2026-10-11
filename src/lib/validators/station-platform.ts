export interface StationPlatformFormValues {
  lineId: string;
  platformNumber: string;
  destinations: string;
  notes: string;
  sortOrder: string;
}

export type StationPlatformFormErrors = Record<
  keyof StationPlatformFormValues,
  string
>;

export function emptyStationPlatformErrors(): StationPlatformFormErrors {
  return {
    lineId: "",
    platformNumber: "",
    destinations: "",
    notes: "",
    sortOrder: "",
  };
}

export function validateStationPlatformForm(
  values: StationPlatformFormValues,
): StationPlatformFormErrors {
  const errors = emptyStationPlatformErrors();
  const sortOrder = Number(values.sortOrder);

  if (!values.platformNumber) {
    errors.platformNumber = "Platform number is required.";
  } else if (values.platformNumber.length > 50) {
    errors.platformNumber = "Platform number must be 50 characters or less.";
  }

  if (!values.destinations) {
    errors.destinations = "Destinations are required.";
  } else if (values.destinations.length > 500) {
    errors.destinations = "Destinations must be 500 characters or less.";
  }

  if (values.lineId && (!Number.isInteger(Number(values.lineId)) || Number(values.lineId) <= 0)) {
    errors.lineId = "Select a valid railway line.";
  }

  if (values.notes.length > 2000) {
    errors.notes = "Walking guidance must be 2000 characters or less.";
  }

  if (values.sortOrder.trim() === "" || !Number.isInteger(sortOrder) || sortOrder < 0) {
    errors.sortOrder = "Sort order must be a non-negative whole number.";
  }

  return errors;
}