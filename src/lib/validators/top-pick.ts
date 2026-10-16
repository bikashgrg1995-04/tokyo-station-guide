
import type { TopPickOpeningHour } from "../db/top-picks";

export interface TopPickFormValues {
  name: string;
  nameJapanese: string;
  slug: string;
  category: string;
  description: string;
  imageUrl: string;
  entryFee: string;
  mapUrl: string;
  notes: string;
  openingHours: TopPickOpeningHour[];
}

export type TopPickFormErrors = Record<
  Exclude<keyof TopPickFormValues, "openingHours">,
  string
> & {
  openingHours: string;
};

export const TOP_PICK_CATEGORIES = [
  "landmark",
  "food",
  "shopping",
  "museum",
  "park",
  "temple",
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyTopPickErrors(): TopPickFormErrors {
  return {
    name: "",
    nameJapanese: "",
    slug: "",
    category: "",
    description: "",
    imageUrl: "",
    entryFee: "",
    mapUrl: "",
    notes: "",
    openingHours: "",
  };
}

export function validateTopPickForm(
  values: TopPickFormValues,
): TopPickFormErrors {
  const errors = emptyTopPickErrors();

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length > 150) {
    errors.name = "Name must be 150 characters or less.";
  }

  if (values.nameJapanese.trim().length > 150) {
    errors.nameJapanese =
      "Japanese name must be 150 characters or less.";
  }

  if (!values.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim())
  ) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  } else if (values.slug.trim().length > 150) {
    errors.slug = "Slug must be 150 characters or less.";
  }

  if (
    !TOP_PICK_CATEGORIES.includes(
      values.category as (typeof TOP_PICK_CATEGORIES)[number],
    )
  ) {
    errors.category = "Select a valid category.";
  }

  if (values.description.length > 1000) {
  errors.description =
    "Description must be 1000 characters or less.";
}

  if (values.entryFee.trim().length > 150) {
    errors.entryFee = "Entry fee must be 150 characters or less.";
  }

  if (values.mapUrl.trim()) {
    let validUrl = false;

    try {
      const url = new URL(values.mapUrl.trim());
      validUrl = url.protocol === "https:" || url.protocol === "http:";
    } catch {
      validUrl = false;
    }

    if (!validUrl) {
      errors.mapUrl = "Enter a valid http(s) Google Maps link.";
    } else if (values.mapUrl.trim().length > 500) {
      errors.mapUrl = "Maps link must be 500 characters or less.";
    }
  }

  if (values.notes.length > 150) {
    errors.notes = "Notes must be 150 characters or less.";
  }

  // The photo is never typed in: it is an uploaded R2 key (or an older
  // URL) and is checked when the file is uploaded, so it is not validated here.

  if (values.openingHours.length > 7) {
    errors.openingHours = "Opening hours cannot contain more than 7 days.";
  } else {
    const seenDays = new Set<number>();

    for (const hour of values.openingHours) {
      if (
        !Number.isInteger(hour.day_of_week) ||
        hour.day_of_week < 0 ||
        hour.day_of_week > 6
      ) {
        errors.openingHours = "Select a valid day for opening hours.";
        break;
      }

      if (seenDays.has(hour.day_of_week)) {
        errors.openingHours = "Each weekday can only be entered once.";
        break;
      }

      seenDays.add(hour.day_of_week);

      if (hour.is_closed) {
        continue;
      }

      if (
        !hour.opening_time ||
        !TIME_PATTERN.test(hour.opening_time)
      ) {
        errors.openingHours =
          "Enter a valid opening time for every open day.";
        break;
      }

      if (
        !hour.closing_time ||
        !TIME_PATTERN.test(hour.closing_time)
      ) {
        errors.openingHours =
          "Enter a valid closing time for every open day.";
        break;
      }

      if (hour.last_entry_time && !TIME_PATTERN.test(hour.last_entry_time)) {
        errors.openingHours =
          "Last entry time must use HH:MM format.";
        break;
      }
    }
  }

  return errors;
}
