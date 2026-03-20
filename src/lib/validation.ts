import {
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_FORMATS,
} from "@/constants/floorPlan";

interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate that the file is a supported format.
 * Checks MIME type first, then falls back to extension.
 */
export function validateFileFormat(file: File): ValidationResult {
  // Check MIME type
  if (
    SUPPORTED_FILE_FORMATS.includes(
      file.type as (typeof SUPPORTED_FILE_FORMATS)[number],
    )
  ) {
    return { valid: true };
  }

  // Fall back to extension
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (
    SUPPORTED_FILE_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_FILE_EXTENSIONS)[number],
    )
  ) {
    return { valid: true };
  }

  return {
    valid: false,
    message: "Unsupported file format. Please upload a PNG, JPG, or PDF file.",
  };
}

/**
 * Validate the roof height value.
 * Must be a positive number greater than zero.
 */
export function validateRoofHeight(value: string | number): ValidationResult {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num) || num <= 0) {
    return {
      valid: false,
      message: "Please enter a valid roof height greater than zero.",
    };
  }

  return { valid: true };
}
