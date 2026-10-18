export interface OperatorFormValues {
  name: string;
  slug: string;
  description: string;
  websiteUrl: string;
  nameJapanese: string;
  descriptionJapanese: string;
}

export type OperatorFormErrors = Record<keyof OperatorFormValues, string>;

export function emptyOperatorErrors(): OperatorFormErrors {
  return {
    name: "",
    slug: "",
    description: "",
    websiteUrl: "",
    nameJapanese: "",
    descriptionJapanese: "",
  };
}

export function validateOperatorForm(
  values: OperatorFormValues,
): OperatorFormErrors {
  const {
    name,
    slug,
    description,
    websiteUrl,
    nameJapanese,
    descriptionJapanese,
  } = values;
  const errors = emptyOperatorErrors();

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > 150) {
    errors.name = "Name must be 150 characters or less.";
  }

  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  } else if (slug.length > 150) {
    errors.slug = "Slug must be 150 characters or less.";
  }

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  if (nameJapanese.length > 150) {
    errors.nameJapanese = "Japanese name must be 150 characters or less.";
  }

  if (descriptionJapanese.length > 1000) {
    errors.descriptionJapanese =
      "Japanese description must be 1000 characters or less.";
  }

  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        errors.websiteUrl = "Website URL must start with http:// or https://.";
      }
    } catch {
      errors.websiteUrl = "Please enter a valid website URL.";
    }
  }

  return errors;
}
