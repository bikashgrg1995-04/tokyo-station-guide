import type { Operator } from "../db/operators";

export interface LineFormValues {
  operatorId: string;
  name: string;
  slug: string;
  code: string;
  color: string;
  description: string;
  nameJapanese: string;
  descriptionJapanese: string;
  /** "1" = browsable on the website, "" = "Coming soon". */
  isPublished: string;
}

export type LineFormErrors = Record<keyof LineFormValues, string>;

export function emptyLineErrors(): LineFormErrors {
  return {
    operatorId: "",
    name: "",
    slug: "",
    code: "",
    color: "",
    description: "",
    nameJapanese: "",
    descriptionJapanese: "",
    isPublished: "",
  };
}

export function validateLineForm(
  values: LineFormValues,
  operators: Operator[],
): LineFormErrors {
  const {
    operatorId,
    name,
    slug,
    code,
    color,
    description,
    nameJapanese,
    descriptionJapanese,
  } = values;
  const errors = emptyLineErrors();

  const parsedOperatorId = Number(operatorId);

  if (!operatorId) {
    errors.operatorId = "Operator is required.";
  } else if (!Number.isInteger(parsedOperatorId) || parsedOperatorId <= 0) {
    errors.operatorId = "Please select a valid operator.";
  } else if (!operators.some((operator) => operator.id === parsedOperatorId)) {
    errors.operatorId = "Selected operator does not exist.";
  }

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

  if (code.length > 50) {
    errors.code = "Code must be 50 characters or less.";
  }

  if (color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      errors.color = "Color must be a valid hex color, such as #00A650.";
    }
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

  return errors;
}
