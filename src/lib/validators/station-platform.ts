export interface StationPlatformFormValues {
  lineId: string;
  platformNumber: string;
  destinations: string;
  destinationsJapanese: string;
  notes: string;
  notesJapanese: string;
  group: string;
  groupJapanese: string;
  legendLabel: string;
  legendLabelJapanese: string;
  legendColor: string;
  groupNote: string;
  groupNoteJapanese: string;
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
    destinationsJapanese: "",
    notes: "",
    notesJapanese: "",
    group: "",
    groupJapanese: "",
    legendLabel: "",
    legendLabelJapanese: "",
    legendColor: "",
    groupNote: "",
    groupNoteJapanese: "",
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

  if (values.destinationsJapanese.length > 500) {
    errors.destinationsJapanese =
      "Japanese destinations must be 500 characters or less.";
  }

  if (values.lineId && (!Number.isInteger(Number(values.lineId)) || Number(values.lineId) <= 0)) {
    errors.lineId = "Select a valid railway line.";
  }

  if (values.group.length > 80) {
    errors.group = "Group name must be 80 characters or less.";
  }

  if (values.groupJapanese.length > 80) {
    errors.groupJapanese = "Japanese group name must be 80 characters or less.";
  }

  if (values.legendLabel.length > 80) errors.legendLabel = "Legend label must be 80 characters or less.";
  if (values.legendLabelJapanese.length > 80) errors.legendLabelJapanese = "Japanese legend label must be 80 characters or less.";
  if (values.legendColor && !/^#[0-9a-fA-F]{6}$/.test(values.legendColor)) errors.legendColor = "Use a colour like #1a7f4b.";
  if (values.groupNote.length > 120) errors.groupNote = "Map note must be 120 characters or less.";
  if (values.groupNoteJapanese.length > 120) errors.groupNoteJapanese = "Japanese map note must be 120 characters or less.";

  if (values.notes.length > 2000) {
    errors.notes = "Walking guidance must be 2000 characters or less.";
  }

  if (values.notesJapanese.length > 2000) {
    errors.notesJapanese =
      "Japanese walking guidance must be 2000 characters or less.";
  }

  if (values.sortOrder.trim() === "" || !Number.isInteger(sortOrder) || sortOrder < 0) {
    errors.sortOrder = "Sort order must be a non-negative whole number.";
  }

  return errors;
}