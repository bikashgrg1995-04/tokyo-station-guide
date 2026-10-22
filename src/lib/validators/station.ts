export interface StationFormValues {
  name: string;
  nameJapanese: string;
  slug: string;
  /** Link to the station on a map (http/https). */
  locationUrl: string;
  description: string;
  descriptionJapanese: string;
  about: string;
  aboutJapanese: string;
  /** Location label on the station page, e.g. "Chiyoda City · Tokyo". */
  region: string;
  regionJapanese: string;
  isVerified: boolean;
  /** Date the station was verified, as YYYY-MM-DD. */
  verifiedAt: string;
}

export type StationFormErrors = Record<
  keyof StationFormValues | "facilities" | "topPicks" | "mainImage",
  string
>;

export function emptyStationErrors(): StationFormErrors {
  return {
    name: "",
    nameJapanese: "",
    slug: "",
    locationUrl: "",
    description: "",
    descriptionJapanese: "",
    about: "",
    aboutJapanese: "",
    region: "",
    regionJapanese: "",
    mainImage: "",
    facilities: "",
    topPicks: "",
    isVerified: "",
    verifiedAt: "",
  };
}

export function toNumberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function validateStationForm(
  values: StationFormValues,
): StationFormErrors {
  const {
    name,
    nameJapanese,
    slug,
    description,
    descriptionJapanese,
    about,
    aboutJapanese,
    region,
    regionJapanese,
  } = values;
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

  if (values.locationUrl) {
    let validUrl = false;

    try {
      const url = new URL(values.locationUrl);
      validUrl = url.protocol === "https:" || url.protocol === "http:";
    } catch {
      validUrl = false;
    }

    if (!validUrl) {
      errors.locationUrl = "Location link must be a valid http(s) URL.";
    } else if (values.locationUrl.length > 500) {
      errors.locationUrl = "Location link must be 500 characters or less.";
    }
  }

  if (values.isVerified && values.verifiedAt) {
    const date = new Date(`${values.verifiedAt}T00:00:00Z`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.verifiedAt) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== values.verifiedAt
    ) {
      errors.verifiedAt = "Pick a valid verification date.";
    }
  }

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  if (descriptionJapanese.length > 1000) {
    errors.descriptionJapanese =
      "Japanese description must be 1000 characters or less.";
  }

  if (about.length > 150) {
    errors.about = "About must be 150 characters or less.";
  }

  if (region.length > 100) {
    errors.region = "Location must be 100 characters or less.";
  }

  if (regionJapanese.length > 100) {
    errors.regionJapanese = "Japanese location must be 100 characters or less.";
  }

  if (aboutJapanese.length > 150) {
    errors.aboutJapanese = "Japanese about must be 150 characters or less.";
  }

  return errors;
}
