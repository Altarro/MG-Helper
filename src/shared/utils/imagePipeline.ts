import {
  ASSET_ACCEPTED_INPUT_MIMES,
  ASSET_INPUT_MAX_BYTES,
  ASSET_MAIN_MAX_EDGE,
  ASSET_THUMB_MAX_EDGE,
  type AssetAcceptedInputMime,
} from '@shared/types/asset';

/**
 * Image processing pipeline: validates input, decodes with EXIF orientation
 * baked in, and produces both a main (≤512 edge) and a thumbnail (≤128 edge)
 * variant normalized to WebP.
 *
 * Uses `createImageBitmap({ imageOrientation: 'from-image' })` so phone photos
 * come out right-side up, and `OffscreenCanvas` where available for a faster,
 * off-main-thread path. Falls back to a regular `<canvas>` element otherwise.
 */

export interface ProcessedImage {
  main: ProcessedImageVariant;
  thumb: ProcessedImageVariant;
}

export interface ProcessedImageVariant {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Łączy wynik dwóch przebiegów `processImage` (osobne kadry PNG): główny obraz z `full`,
 * miniaturowy wariant listy z `thumb`.
 */
export function mergeDualSquareCropsIntoProcessedImage(
  full: ProcessedImage,
  thumb: ProcessedImage,
): ProcessedImage {
  return {
    main: full.main,
    thumb: thumb.thumb,
  };
}

export type ValidateResult =
  | { ok: true; mime: AssetAcceptedInputMime }
  | { ok: false; reason: ValidationFailure };

export type ValidationFailure =
  | 'too_large'
  | 'unsupported_mime'
  | 'unsupported_signature'
  | 'empty';

const MAIN_QUALITY = 0.85;
const THUMB_QUALITY = 0.8;

/**
 * Maps the first few bytes of a file to a canonical image MIME.
 * Using magic bytes rather than trusting `File.type` prevents a user from
 * smuggling a disallowed format (e.g. SVG renamed to `.jpg`).
 */
async function readHeadBytes(file: Blob, length: number): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  // Prefer the native Blob.arrayBuffer() (modern browsers + jsdom ≥20 where available).
  if (typeof slice.arrayBuffer === 'function') {
    return new Uint8Array(await slice.arrayBuffer());
  }
  // Fallback for test environments that implement Blob via older FileReader only.
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) resolve(new Uint8Array(result));
      else reject(new Error('Unexpected FileReader result type.'));
    };
    reader.readAsArrayBuffer(slice);
  });
}

export async function detectImageMime(file: Blob): Promise<AssetAcceptedInputMime | null> {
  const head = await readHeadBytes(file, 12);
  if (head.length < 4) return null;

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: "GIF87a" or "GIF89a"
  if (
    head[0] === 0x47 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x38 &&
    (head[4] === 0x37 || head[4] === 0x39) &&
    head[5] === 0x61
  ) {
    return 'image/gif';
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return 'image/webp';
  }
  // BMP: "BM"
  if (head[0] === 0x42 && head[1] === 0x4d) return 'image/bmp';

  return null;
}

export async function validateImageFile(file: File | Blob): Promise<ValidateResult> {
  if (file.size === 0) return { ok: false, reason: 'empty' };
  if (file.size > ASSET_INPUT_MAX_BYTES) return { ok: false, reason: 'too_large' };

  const declared = (file as File).type || '';
  if (declared && !ASSET_ACCEPTED_INPUT_MIMES.includes(declared as AssetAcceptedInputMime)) {
    return { ok: false, reason: 'unsupported_mime' };
  }

  const detected = await detectImageMime(file);
  if (!detected) return { ok: false, reason: 'unsupported_signature' };

  return { ok: true, mime: detected };
}

/** Fit source into max*max preserving aspect ratio. Returns integer pixels. */
export function fitInside(
  srcW: number,
  srcH: number,
  maxEdge: number,
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

interface CanvasLike {
  width: number;
  height: number;
  getContext(id: '2d'): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

async function drawToBlob(
  source: ImageBitmap,
  target: { width: number; height: number },
  quality: number,
): Promise<Blob> {
  // Prefer OffscreenCanvas (off-main-thread encoding, zero DOM dependency).
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(target.width, target.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Nie udalo sie uzyskac kontekstu 2D (OffscreenCanvas).');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, target.width, target.height);
    return canvas.convertToBlob({ type: 'image/webp', quality });
  }

  // DOM fallback.
  const canvas: CanvasLike = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Nie udalo sie uzyskac kontekstu 2D (canvas).');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, target.width, target.height);

  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (!blob) reject(new Error('Kodowanie WebP zwrocilo pusty blob.'));
        else resolve(blob);
      },
      'image/webp',
      quality,
    );
  });
}

/**
 * Decodes `file`, resizes to main (512) and thumbnail (128) bounding boxes
 * preserving aspect ratio, and re-encodes both to WebP (no EXIF retained).
 */
export async function processImage(file: File | Blob): Promise<ProcessedImage> {
  // Let the browser handle EXIF orientation so phone photos aren't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const mainSize = fitInside(bitmap.width, bitmap.height, ASSET_MAIN_MAX_EDGE);
    const thumbSize = fitInside(bitmap.width, bitmap.height, ASSET_THUMB_MAX_EDGE);

    const [mainBlob, thumbBlob] = await Promise.all([
      drawToBlob(bitmap, mainSize, MAIN_QUALITY),
      drawToBlob(bitmap, thumbSize, THUMB_QUALITY),
    ]);

    return {
      main: {
        blob: mainBlob,
        width: mainSize.width,
        height: mainSize.height,
        bytes: mainBlob.size,
      },
      thumb: {
        blob: thumbBlob,
        width: thumbSize.width,
        height: thumbSize.height,
        bytes: thumbBlob.size,
      },
    };
  } finally {
    bitmap.close?.();
  }
}

/** Releases an object URL created via `URL.createObjectURL`. */
export function revokePreviewUrl(url: string | null | undefined): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore — browser sometimes rejects double-revoke
  }
}
