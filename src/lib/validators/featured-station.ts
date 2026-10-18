export interface FeaturedStationFormValues {
  /** Selected station id, as typed in the form. */
  stationId: string;
  imageUrl: string;
  description: string;
  descriptionJapanese: string;
  /** Sort order, as typed in the form. */
  sortOrder: string;
  isActive: boolean;
}

export type FeaturedStationFormErrors = Record<
  "stationId" | "imageUrl" | "description" | "descriptionJapanese" | "sortOrder",
  string
>;

export function emptyFeaturedStationErrors(): FeaturedStationFormErrors {
  return {
    stationId: "",
    imageUrl: "",
    description: "",
    descriptionJapanese: "",
    sortOrder: "",
  };
}

export function validateFeaturedStationForm(
  values: FeaturedStationFormValues,
): FeaturedStationFormErrors {
  const { stationId, description, descriptionJapanese, sortOrder } = values;
  const errors = emptyFeaturedStationErrors();

  const stationNumber = stationId === "" ? null : Number(stationId);

  if (
    stationNumber === null ||
    !Number.isInteger(stationNumber) ||
    stationNumber <= 0
  ) {
    errors.stationId = "Please select a station.";
  }

  // The photo is an uploaded file; the service checks that one is present.

  if (description.length > 200) {
    errors.description = "Description must be 200 characters or less.";
  }

  if (descriptionJapanese.length > 200) {
    errors.descriptionJapanese =
      "Japanese description must be 200 characters or less.";
  }

  const sortNumber = sortOrder === "" ? null : Number(sortOrder);

  if (sortNumber === null || !Number.isInteger(sortNumber) || sortNumber < 0) {
    errors.sortOrder = "Sort order must be a non-negative number.";
  }

  return errors;
}
