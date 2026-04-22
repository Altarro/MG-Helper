import { useState } from 'react';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { Modal } from './Modal';

export interface EntityDetailPortraitProps {
  imageId: string | null | undefined;
  /** Alt text; falls back to empty string for decorative-only cases. */
  alt?: string;
  size?: 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<EntityDetailPortraitProps['size']>, string> = {
  md: 'h-24 w-24',
  lg: 'h-28 w-28 sm:h-32 sm:w-32',
};

/**
 * W nagłówku detalu: **miniaturka** z asseta; klik otwiera **pełny** obraz w modalu.
 */
export function EntityDetailPortrait({
  imageId,
  alt = '',
  size = 'md',
  className = '',
}: EntityDetailPortraitProps) {
  const thumbUrl = useAssetUrl(imageId ?? null, { thumb: true });
  const fullUrl = useAssetUrl(imageId ?? null, { thumb: false });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const previewUrl = thumbUrl ?? fullUrl;
  if (!previewUrl) return null;

  const canOpenFull = Boolean(fullUrl);

  return (
    <>
      <button
        type="button"
        onClick={() => canOpenFull && setLightboxOpen(true)}
        disabled={!canOpenFull}
        aria-label={canOpenFull ? `${alt || 'Obrazek'} — pokaż pełny rozmiar` : alt || 'Obrazek'}
        className={`group relative shrink-0 overflow-hidden rounded-2xl border border-white/50 shadow-[0_12px_28px_rgba(18,45,66,0.12)] transition hover:ring-2 hover:ring-primary-400/40 focus:outline-none focus:ring-2 focus:ring-primary-500/35 disabled:cursor-default disabled:hover:ring-0 ${SIZE_CLASS[size]} ${canOpenFull ? 'cursor-zoom-in' : ''} ${className}`}
      >
        <img
          src={previewUrl}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {canOpenFull && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1.5 pb-1 pt-4 text-center text-[0.65rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Pełny
          </span>
        )}
      </button>

      {lightboxOpen && fullUrl && (
        <Modal title="Pełny obraz" size="xl" onClose={() => setLightboxOpen(false)}>
          <div className="flex justify-center">
            <img
              src={fullUrl}
              alt={alt}
              className="max-h-[min(85vh,42rem)] max-w-full rounded-xl object-contain shadow-lg"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
