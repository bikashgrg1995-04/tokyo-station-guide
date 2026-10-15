/** What a visitor sends: which station, which line, and one message. */
export interface StationSuggestionValues {
  stationId: string;
  lineId: string;
  message: string;
}

export type StationSuggestionErrors = Record<
  keyof StationSuggestionValues,
  string
>;

export const SUGGESTION_MESSAGE_MIN = 3;
export const SUGGESTION_MESSAGE_MAX = 1000;

export function emptyStationSuggestionErrors(): StationSuggestionErrors {
  return {
    stationId: "",
    lineId: "",
    message: "",
  };
}

export function validateStationSuggestion(
  values: StationSuggestionValues,
): StationSuggestionErrors {
  const errors = emptyStationSuggestionErrors();

  const stationId = Number(values.stationId);

  if (
    !values.stationId.trim() ||
    !Number.isSafeInteger(stationId) ||
    stationId <= 0
  ) {
    errors.stationId = "A valid station is required.";
  }

  // The line is optional, but when it is sent it must be a valid id.
  if (values.lineId.trim() !== "") {
    const lineId = Number(values.lineId);

    if (!Number.isSafeInteger(lineId) || lineId <= 0) {
      errors.lineId = "The selected line is not valid.";
    }
  }

  if (values.message.length < SUGGESTION_MESSAGE_MIN) {
    errors.message = "Please tell us what you would like to suggest.";
  } else if (values.message.length > SUGGESTION_MESSAGE_MAX) {
    errors.message = `Your suggestion must be ${SUGGESTION_MESSAGE_MAX} characters or less.`;
  }

  return errors;
}
