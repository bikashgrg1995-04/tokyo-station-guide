import { isFacilityCategory } from "../facility-categories";

export interface FacilityFormValues {
  name: string;
  nameJapanese: string;
  slug: string;
  icon: string;
  sortOrder: string;
  category: string;
}

export type FacilityFormErrors = Record<
  keyof FacilityFormValues | "iconFile" | "iconDarkFile",
  string
>;

export function emptyFacilityErrors(): FacilityFormErrors {
  return {
    name: "",
    nameJapanese: "",
    slug: "",
    icon: "",
    iconFile: "",
    iconDarkFile: "",
    sortOrder: "",
    category: "",
  };
}

export function validateFacilityForm(
  values: FacilityFormValues,
): FacilityFormErrors {
  const { name, nameJapanese, slug, icon, sortOrder, category } = values;
  const errors = emptyFacilityErrors();

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > 150) {
    errors.name = "Name must be 150 characters or less.";
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

  if (icon.length > 100) {
    errors.icon = "Icon must be 100 characters or less.";
  } else if (icon.startsWith("facility-icons/")) {
    errors.icon = "That value is reserved for uploaded icon files.";
  }

  if (!isFacilityCategory(category)) {
    errors.category = "Choose a group for this facility.";
  }

  if (sortOrder.trim() === "") {
    errors.sortOrder = "Sort order is required.";
  } else {
    const parsedSortOrder = Number(sortOrder);

    if (
      !Number.isInteger(parsedSortOrder) ||
      parsedSortOrder < 0
    ) {
      errors.sortOrder =
        "Sort order must be a non-negative integer.";
    }
  }

  return errors;
}
