/** Standard Australian ceiling height in metres. */
export const DEFAULT_ROOF_HEIGHT = 2.4;

/** MIME types accepted for floor plan uploads. */
export const SUPPORTED_FILE_FORMATS = [
  "image/png",
  "image/jpeg",
  "application/pdf",
] as const;

/** File extensions accepted for floor plan uploads. */
export const SUPPORTED_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"] as const;

/** Maximum upload file size in megabytes. */
export const MAX_UPLOAD_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB ?? 10,
);
