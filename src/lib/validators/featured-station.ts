export interface FeaturedStationFormValues {
  /** Selected station id, as typed in the form. */
  stationId: string;
  imageUrl: string;
  description: string;
  /** Sort order, as typed in the form. */
  sortOrder: string;
  isActive: boolean;
}

export type FeaturedStationFormErrors = Record<
  "stationId" | "imageUrl" | "description" | "sortOrder",
  string
>;

export function emptyFeaturedStationErrors(): FeaturedStationFormErrors {
  return { stationId: "", imageUrl: "", description: "", sortOrder: "" };
}

export function validateFeaturedStationForm(
  values: FeaturedStationFormValues,
): FeaturedStationFormErrors {
  const { stationId, imageUrl, description, sortOrder } = values;
  const errors = emptyFeaturedStationErrors();

  const stationNumber = stationId === "" ? null : Number(stationId);

  if (
    stationNumber === null ||
    !Number.isInteger(stationNumber) ||
    stationNumber <= 0
  ) {
    errors.stationId = "Please select a station.";
  }

  if (!imageUrl) {
    errors.imageUrl = "Image URL is required.";
  } else if (imageUrl.length > 2000) {
    errors.imageUrl = "Image URL must be 2000 characters or less.";
  } else {
    try {
      const parsedUrl = new URL(imageUrl);

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        errors.imageUrl = "Image URL must use http or https.";
      }
    } catch {
      errors.imageUrl = "Please enter a valid image URL.";
    }
  }

  if (description.length > 200) {
    errors.description = "Description must be 200 characters or less.";
  }

  const sortNumber = sortOrder === "" ? null : Number(sortOrder);

  if (sortNumber === null || !Number.isInteger(sortNumber) || sortNumber < 0) {
    errors.sortOrder = "Sort order must be a non-negative number.";
  }

  return errors;
}
