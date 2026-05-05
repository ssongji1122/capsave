/** Maximum number of files allowed in a single batch upload */
export const MAX_BATCH_FILES = 10;

/** Accepted MIME types for image upload endpoints */
export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum upload file size (5 MB) */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

/** Maximum pixel width before resizing for AI analysis */
export const ANALYZE_MAX_WIDTH = 2048;

/** JPEG quality for client-side canvas resize (0–1 scale, used with canvas.toBlob) */
export const ANALYZE_JPEG_QUALITY = 0.85;

/** JPEG quality for server-side sharp resize (1–100 scale, used with sharp) */
export const ANALYZE_JPEG_QUALITY_SHARP = 85;
