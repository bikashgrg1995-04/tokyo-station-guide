export interface StationSuggestionValues {
  stationId: string;
  name: string;
  nameJapanese: string;
  description: string;
  about: string;
  latitude: string;
  longitude: string;
  reason: string;
  submitterName: string;
  submitterEmail: string;
}

export type StationSuggestionErrors = Record<
  keyof StationSuggestionValues,
  string
>;

export function emptyStationSuggestionErrors(): StationSuggestionErrors {
  return {
    stationId: "",
    name: "",
    nameJapanese: "",
    description: "",
    about: "",
    latitude: "",
    longitude: "",
    reason: "",
    submitterName: "",
    submitterEmail: "",
  };
}

export function validateStationSuggestion(
  values: StationSuggestionValues,
): StationSuggestionErrors {
  const errors = emptyStationSuggestionErrors();

  const stationId = Number(values.stationId);
  const latitude =
    values.latitude.trim() === "" ? null : Number(values.latitude);
  const longitude =
    values.longitude.trim() === "" ? null : Number(values.longitude);

  if (
    !values.stationId.trim() ||
    !Number.isSafeInteger(stationId) ||
    stationId <= 0
  ) {
    errors.stationId = "A valid station is required.";
  }

  if (values.name.length > 150) {
    errors.name = "Station name must be 150 characters or less.";
  }

  if (values.nameJapanese.length > 150) {
    errors.nameJapanese = "Japanese name must be 150 characters or less.";
  }

  if (values.description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  if (values.about.length > 1000) {
    errors.about = "About must be 1000 characters or less.";
  }

  if (latitude !== null && !Number.isFinite(latitude)) {
    errors.latitude = "Latitude must be a valid number.";
  } else if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }

  if (longitude !== null && !Number.isFinite(longitude)) {
    errors.longitude = "Longitude must be a valid number.";
  } else if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }

  if (values.reason.length > 1000) {
    errors.reason = "Reason must be 1000 characters or less.";
  }

  if (values.submitterName.length > 100) {
    errors.submitterName = "Name must be 100 characters or less.";
  }

  if (values.submitterEmail.length > 254) {
    errors.submitterEmail = "Email must be 254 characters or less.";
  } else if (
    values.submitterEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.submitterEmail.trim())
  ) {
    errors.submitterEmail = "Enter a valid email address.";
  }

  return errors;
}
