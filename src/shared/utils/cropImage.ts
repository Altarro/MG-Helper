import type { Area } from 'react-easy-crop';

/**
 * Renders the given rectangular region (in **source image pixel space**, as
 * returned by `react-easy-crop`'s `onCropComplete`) into a PNG blob.
 */
export function getCroppedImageBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const w = Math.max(1, Math.round(pixelCrop.width));
      const h = Math.max(1, Math.round(pixelCrop.height));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        w,
        h,
      );
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('canvas.toBlob returned null'));
        },
        'image/png',
        0.92,
      );
    };
    image.onerror = () => reject(new Error('Failed to load image for crop'));
    image.src = imageSrc;
  });
}
