import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectImageMime,
  fitInside,
  mergeDualSquareCropsIntoProcessedImage,
  processImage,
  validateImageFile,
} from '@shared/utils/imagePipeline';
import {
  ASSET_INPUT_MAX_BYTES,
  ASSET_MAIN_MAX_EDGE,
  ASSET_THUMB_MAX_EDGE,
} from '@shared/types/asset';

function blobFromBytes(bytes: number[], type = 'application/octet-stream'): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

function fileFromBytes(bytes: number[], name = 'x', type = ''): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('fitInside', () => {
  it('keeps aspect ratio when landscape', () => {
    expect(fitInside(1024, 512, 512)).toEqual({ width: 512, height: 256 });
  });

  it('keeps aspect ratio when portrait', () => {
    expect(fitInside(256, 1024, 128)).toEqual({ width: 32, height: 128 });
  });

  it('does not upscale images smaller than the bounding box', () => {
    expect(fitInside(100, 80, 512)).toEqual({ width: 100, height: 80 });
  });

  it('returns at least 1 pixel per edge', () => {
    expect(fitInside(1, 1, 128)).toEqual({ width: 1, height: 1 });
  });
});

describe('detectImageMime', () => {
  it('detects JPEG by SOI + marker', async () => {
    expect(await detectImageMime(blobFromBytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe('image/jpeg');
  });

  it('detects PNG signature', async () => {
    expect(
      await detectImageMime(
        blobFromBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
      ),
    ).toBe('image/png');
  });

  it('detects GIF87a and GIF89a', async () => {
    const gif87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0];
    const gif89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
    expect(await detectImageMime(blobFromBytes(gif87))).toBe('image/gif');
    expect(await detectImageMime(blobFromBytes(gif89))).toBe('image/gif');
  });

  it('detects WebP RIFF/WEBP container', async () => {
    const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
    expect(await detectImageMime(blobFromBytes(webp))).toBe('image/webp');
  });

  it('detects BMP', async () => {
    expect(await detectImageMime(blobFromBytes([0x42, 0x4d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      'image/bmp',
    );
  });

  it('rejects SVG-like text', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
    expect(await detectImageMime(new Blob([svg], { type: 'image/svg+xml' }))).toBeNull();
  });

  it('rejects unknown signatures', async () => {
    expect(await detectImageMime(blobFromBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});

describe('validateImageFile', () => {
  it('rejects empty files', async () => {
    const file = fileFromBytes([], 'empty.png', 'image/png');
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });

  it('rejects files over the size limit', async () => {
    // Fake size without allocating memory: override File.size via Object.defineProperty
    const file = fileFromBytes([0xff, 0xd8, 0xff, 0xe0], 'huge.jpg', 'image/jpeg');
    Object.defineProperty(file, 'size', { value: ASSET_INPUT_MAX_BYTES + 1 });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too_large');
  });

  it('rejects disallowed declared MIME even if bytes look like a known format', async () => {
    const file = fileFromBytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      'x.svg',
      'image/svg+xml',
    );
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unsupported_mime');
  });

  it('rejects files with allowed MIME but foreign signature (smuggled SVG as jpg)', async () => {
    const svgBytes = Array.from(
      new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    );
    const file = fileFromBytes(svgBytes, 'fake.jpg', 'image/jpeg');
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unsupported_signature');
  });

  it('accepts a PNG with matching declared MIME', async () => {
    const file = fileFromBytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
      'x.png',
      'image/png',
    );
    const result = await validateImageFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mime).toBe('image/png');
  });
});

/*
 * processImage needs createImageBitmap + OffscreenCanvas which jsdom does
 * not provide; we stub just enough to verify it calls the expected sizes
 * and produces two variants.
 */
describe('processImage', () => {
  const originalCreateImageBitmap = (globalThis as typeof globalThis & {
    createImageBitmap?: typeof createImageBitmap;
  }).createImageBitmap;
  const originalOffscreenCanvas = (globalThis as typeof globalThis & {
    OffscreenCanvas?: typeof OffscreenCanvas;
  }).OffscreenCanvas;

  beforeEach(() => {
    class StubOffscreenCanvas {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext(kind: string) {
        if (kind !== '2d') return null;
        return {
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
          drawImage: vi.fn(),
        };
      }
      convertToBlob(opts: { type: string; quality: number }) {
        // Encode width/height into blob content so tests can inspect them.
        const payload = `${opts.type}:${opts.quality}:${this.width}x${this.height}`;
        return Promise.resolve(new Blob([payload], { type: opts.type }));
      }
    }

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 2048,
        height: 1024,
        close: vi.fn(),
      })) as unknown as typeof createImageBitmap,
    );
    vi.stubGlobal('OffscreenCanvas', StubOffscreenCanvas as unknown as typeof OffscreenCanvas);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCreateImageBitmap) {
      (globalThis as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap =
        originalCreateImageBitmap;
    }
    if (originalOffscreenCanvas) {
      (globalThis as { OffscreenCanvas?: typeof OffscreenCanvas }).OffscreenCanvas =
        originalOffscreenCanvas;
    }
  });

  it('produces main and thumb variants with fitted dimensions', async () => {
    const file = fileFromBytes([0xff, 0xd8, 0xff, 0xe0], 'x.jpg', 'image/jpeg');
    const result = await processImage(file);

    // Source 2048x1024 → main fits in 512x512 → 512x256
    expect(result.main.width).toBe(ASSET_MAIN_MAX_EDGE);
    expect(result.main.height).toBe(ASSET_MAIN_MAX_EDGE / 2);
    expect(result.main.blob.type).toBe('image/webp');

    // thumb fits in 128 → 128x64
    expect(result.thumb.width).toBe(ASSET_THUMB_MAX_EDGE);
    expect(result.thumb.height).toBe(ASSET_THUMB_MAX_EDGE / 2);
    expect(result.thumb.blob.type).toBe('image/webp');

    expect(result.main.bytes).toBeGreaterThan(0);
    expect(result.thumb.bytes).toBeGreaterThan(0);
  });

  it('passes imageOrientation: from-image so EXIF rotation is applied', async () => {
    const spy = globalThis.createImageBitmap as unknown as ReturnType<typeof vi.fn>;
    const file = fileFromBytes([0xff, 0xd8, 0xff, 0xe0], 'x.jpg', 'image/jpeg');
    await processImage(file);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ imageOrientation: 'from-image' });
  });
});

describe('mergeDualSquareCropsIntoProcessedImage', () => {
  it('łączy main z pełnego przebiegu i thumb z drugiego', () => {
    const v = (label: string) => ({
      blob: new Blob([label], { type: 'image/webp' }),
      width: 2,
      height: 2,
      bytes: 4,
    });
    const full = { main: v('MAIN'), thumb: v('unused-full-thumb') };
    const thumb = { main: v('unused-thumb-main'), thumb: v('LIST-THUMB') };
    const merged = mergeDualSquareCropsIntoProcessedImage(full, thumb);
    expect(merged.main).toBe(full.main);
    expect(merged.thumb).toBe(thumb.thumb);
  });
});
