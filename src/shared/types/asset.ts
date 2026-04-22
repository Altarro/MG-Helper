/**
 * Asset row stored in IndexedDB. Represents a single image attached to an
 * entity (e.g. NPC portrait, location cover). Both the main (≤512x512) and
 * thumbnail (≤128x128) variants live on the same row so they share a lifetime;
 * mogą powstać z dwóch różnych kwadratowych kadrowań (pełny vs miniaturka).
 *
 * Images are always normalized to WebP during the resize pipeline, so the
 * stored MIME is always `image/webp`.
 */
export interface Asset {
  id: string;
  mime: 'image/webp';
  width: number;
  height: number;
  bytes: number;
  blob: Blob;
  thumb: AssetThumb;
  createdAt: string;
}

export interface AssetThumb {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
}

/** Upper bound for the main (full-size) image edge in pixels. */
export const ASSET_MAIN_MAX_EDGE = 512;

/** Upper bound for the thumbnail edge in pixels. */
export const ASSET_THUMB_MAX_EDGE = 128;

/** Hard cap on input file size before resize (20 MB). */
export const ASSET_INPUT_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Input image MIME types accepted by the picker / pipeline.
 * SVG is excluded for XSS reasons; HEIC/HEIF because browsers cannot decode it.
 */
export const ASSET_ACCEPTED_INPUT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
] as const;

export type AssetAcceptedInputMime = (typeof ASSET_ACCEPTED_INPUT_MIMES)[number];
