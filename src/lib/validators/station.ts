export interface StationFormValues {
  name: string;
  nameJapanese: string;
  slug: string;
  /** Latitude as typed in the form. */
  latitude: string;
  /** Longitude as typed in the form. */
  longitude: string;
  description: string;
  about: string;
}

export type StationFormErrors = Record<
  keyof StationFormValues | "facilities" | "topPicks",
  string
>;

export function emptyStationErrors(): StationFormErrors {
  return {
    name: "",
    nameJapanese: "",
    slug: "",
    latitude: "",
    longitude: "",
    description: "",
    about: "",
    facilities: "",
    topPicks: "",
  };
}

export function toNumberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function validateStationForm(
  values: StationFormValues,
): StationFormErrors {
  const { name, nameJapanese, slug, description, about } = values;
  const latitude = toNumberOrNull(values.latitude);
  const longitude = toNumberOrNull(values.longitude);
  const errors = emptyStationErrors();

  if (!name) {
    errors.name = "Station name is required.";
  } else if (name.length > 150) {
    errors.name = "Station name must be 150 characters or less.";
  }

  if (nameJapanese.length > 150) {
    errors.nameJapanese = "Japanese name must be 150 characters or less.";
  }

  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  } else if (slug.length > 150) {
    errors.slug = "Slug must be 150 characters or less.";
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

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  if (about.length > 1000) {
    errors.about = "About must be 1000 characters or less.";
  }

  return errors;
}
