export interface TopPickFormValues {
  name: string;
  nameJapanese: string;
  slug: string;
  category: string;
  description: string;
  imageUrl: string;
}

export type TopPickFormErrors = Record<
  keyof TopPickFormValues,
  string
>;

export const TOP_PICK_CATEGORIES = [
  "landmark",
  "food",
  "shopping",
  "museum",
  "park",
  "temple",
] as const;

export function emptyTopPickErrors(): TopPickFormErrors {
  return {
    name: "",
    nameJapanese: "",
    slug: "",
    category: "",
    description: "",
    imageUrl: "",
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

  if (values.description.length > 2000) {
    errors.description =
      "Description must be 2000 characters or less.";
  }

  if (values.imageUrl.trim()) {
    try {
      const url = new URL(values.imageUrl.trim());

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.imageUrl = "Image URL must use HTTP or HTTPS.";
      }
    } catch {
      errors.imageUrl = "Enter a valid image URL.";
    }
  }

  return errors;
}