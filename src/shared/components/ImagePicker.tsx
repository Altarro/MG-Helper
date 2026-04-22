import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { saveAsset, deleteAsset, getAsset } from '@shared/db/assets';
import { useCampaign } from '@shared/db/CampaignContext';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { ImageCropModal } from './ImageCropModal';
import { Modal } from './Modal';
import {
  ASSET_ACCEPTED_INPUT_MIMES,
  ASSET_INPUT_MAX_BYTES,
} from '@shared/types/asset';
import {
  mergeDualSquareCropsIntoProcessedImage,
  processImage,
  revokePreviewUrl,
  validateImageFile,
  type ValidationFailure,
} from '@shared/utils/imagePipeline';

export interface ImagePickerProps {
  imageId: string | null | undefined;
  imageAlt: string | undefined;
  /**
   * Called with the new asset id (or null when the user removes the image).
   * Also receives the previous id so the form can delete the orphan in its
   * own save flow if needed. The picker itself does NOT delete the previous
   * asset — the parent form owns the save lifecycle.
   */
  onChange: (next: { imageId: string | null; imageAlt: string }) => void;
  label?: string;
  /** Prefix for form element ids to avoid collisions when picker is used twice. */
  idPrefix?: string;
  disabled?: boolean;
}

const FAILURE_MESSAGES: Record<ValidationFailure, string> = {
  empty: 'Plik jest pusty.',
  too_large: `Plik jest za duży (limit: ${Math.round(ASSET_INPUT_MAX_BYTES / (1024 * 1024))} MB).`,
  unsupported_mime: 'Nieobsługiwany format. Akceptowane: JPG, PNG, WebP, GIF, BMP.',
  unsupported_signature: 'Plik nie wygląda na prawdziwy obrazek (zła sygnatura).',
};

const ACCEPT_ATTR = ASSET_ACCEPTED_INPUT_MIMES.join(',');

/**
 * Portrait / cover image picker used by NPC, Location, Item, Faction forms.
 *
 * - Click, drag&drop or clipboard paste (while focused).
 * - After a valid file is chosen, modal z dwoma kadrami 1:1 (**Pełny** + **Miniaturka**);
 *   zapis: `main` z pełnego kadru, `thumb` z osobnego kadru (listy używają miniatury).
 * - Podgląd w pickerze: miniatura; klik otwiera pełny obraz.
 * - The picker does NOT revoke previous assets — the parent form is responsible
 *   for calling `deleteAsset` on the *previous* id once the save succeeds.
 */
export function ImagePicker({
  imageId,
  imageAlt,
  onChange,
  label = 'Obrazek',
  idPrefix = 'image-picker',
  disabled = false,
}: ImagePickerProps) {
  const { db } = useCampaign();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cropSession, setCropSession] = useState<{ objectUrl: string } | null>(null);

  const thumbPreviewUrl = useAssetUrl(imageId, { thumb: true });
  const fullPreviewUrl = useAssetUrl(imageId, { thumb: false });
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false);
  const previewSrc = thumbPreviewUrl ?? fullPreviewUrl;

  const persistAndNotify = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        // best-effort only
      }
    }
  }, []);

  const saveDualCrops = useCallback(
    async (pair: { full: Blob; thumb: Blob }) => {
      for (const blob of [pair.full, pair.thumb]) {
        const validation = await validateImageFile(blob);
        if (!validation.ok) {
          toast.error(FAILURE_MESSAGES[validation.reason]);
          return;
        }
      }
      const [fullProcessed, thumbProcessed] = await Promise.all([
        processImage(pair.full),
        processImage(pair.thumb),
      ]);
      const combined = mergeDualSquareCropsIntoProcessedImage(fullProcessed, thumbProcessed);
      const newId = await saveAsset(db, combined);
      await persistAndNotify();
      onChange({ imageId: newId, imageAlt: imageAlt ?? '' });
      toast.success('Obrazek dodany');
    },
    [db, imageAlt, onChange, persistAndNotify],
  );

  const handleFile = useCallback(
    async (file: File | Blob) => {
      if (disabled) return;
      setBusy(true);
      try {
        const validation = await validateImageFile(file);
        if (!validation.ok) {
          toast.error(FAILURE_MESSAGES[validation.reason]);
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        setCropSession((prev) => {
          if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
          return { objectUrl };
        });
      } catch (err) {
        console.error('Image validation failed', err);
        toast.error('Nie udało się wczytać obrazka');
      } finally {
        setBusy(false);
      }
    },
    [disabled],
  );

  const closeCropSession = useCallback(() => {
    setCropSession((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
  }, []);

  const cropSessionRef = useRef(cropSession);
  cropSessionRef.current = cropSession;
  useEffect(
    () => () => {
      const url = cropSessionRef.current?.objectUrl;
      if (url) URL.revokeObjectURL(url);
    },
    [],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFile(file);
  }

  async function handleRemove() {
    if (!imageId || disabled) return;
    // Best-effort — the asset may already be gone. Parent form flushes the
    // reference change so the orphan cleanup job can reclaim the row later.
    try {
      const existing = await getAsset(db, imageId);
      if (existing) await deleteAsset(db, imageId);
    } catch {
      // ignore
    }
    onChange({ imageId: null, imageAlt: '' });
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    // Avoid flicker when dragging over children: only reset when leaving the zone itself.
    if (e.target === dropZoneRef.current) setDragActive(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    if (file) {
      e.preventDefault();
      void handleFile(file);
    }
  }

  // Revoke the preview URL on unmount — done inside the useAssetUrl hook, but
  // we also strip any dangling blob: URL if the id vanished mid-session.
  useEffect(
    () => () => {
      revokePreviewUrl(thumbPreviewUrl);
      revokePreviewUrl(fullPreviewUrl);
    },
    [thumbPreviewUrl, fullPreviewUrl],
  );

  const altInputId = `${idPrefix}-alt`;

  return (
    <div className="flex flex-col gap-2">
      {cropSession && (
        <ImageCropModal
          imageSrc={cropSession.objectUrl}
          onClose={closeCropSession}
          onConfirm={async (pair) => {
            setBusy(true);
            try {
              await saveDualCrops(pair);
              closeCropSession();
            } catch (err) {
              console.error('Image processing failed', err);
              toast.error('Nie udało się przetworzyć obrazka');
              throw err;
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {previewLightboxOpen && fullPreviewUrl && (
        <Modal title="Pełny obraz" size="xl" onClose={() => setPreviewLightboxOpen(false)}>
          <div className="flex justify-center">
            <img
              src={fullPreviewUrl}
              alt={imageAlt || 'Pełny obraz'}
              className="max-h-[min(85vh,42rem)] max-w-full rounded-xl object-contain shadow-lg"
            />
          </div>
        </Modal>
      )}

      {label && <span className="text-sm font-medium text-surface-800">{label}</span>}

      <div
        ref={dropZoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-busy={busy}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`app-input-shell flex min-h-[9rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-4 py-5 text-center transition-colors ${
          dragActive ? 'border-primary-500 bg-primary-50' : ''
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {previewSrc ? (
          <div className="flex w-full flex-col items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (fullPreviewUrl) setPreviewLightboxOpen(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!fullPreviewUrl}
              className={`group relative max-h-48 max-w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-default ${
                fullPreviewUrl ? 'cursor-zoom-in' : ''
              }`}
              aria-label={fullPreviewUrl ? 'Pokaż pełny obraz' : 'Podgląd obrazka'}
            >
              <img
                src={previewSrc}
                alt={imageAlt || 'Podgląd obrazka'}
                className="max-h-48 max-w-full rounded-xl object-contain shadow-[0_8px_18px_rgba(18,45,66,0.15)]"
              />
              {fullPreviewUrl && (
                <span className="text-surface-600 absolute inset-x-0 bottom-0 rounded-b-xl bg-white/85 px-2 py-1 text-[0.65rem] font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Kliknij — pełny rozmiar
                </span>
              )}
            </button>
            <p className="text-xs text-surface-500">
              Podgląd: miniaturka z listy. Kliknij obrazek, aby zobaczyć pełny kadr. Upuść lub wklej
              plik, aby podmienić.
            </p>
          </div>
        ) : busy ? (
          <div className="flex items-center gap-2 text-sm text-surface-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Przetwarzanie…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-surface-600">
            <ImagePlus className="h-6 w-6 text-primary-600" />
            <div className="flex flex-col items-center">
              <span className="font-medium text-surface-800">
                Upuść plik, wklej (Ctrl+V) albo kliknij
              </span>
              <span className="text-xs text-surface-500">
                JPG, PNG, WebP, GIF, BMP · maks. {Math.round(ASSET_INPUT_MAX_BYTES / (1024 * 1024))} MB
              </span>
              <span className="text-xs text-surface-400">
                Po wyborze: dwa kwadratowe kadry (Pełny + Miniaturka), potem WebP — główny do ~512 px,
                osobna miniaturka do ~128 px na listy.
              </span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || busy}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className="app-button-secondary inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {imageId ? 'Podmień' : 'Wybierz plik'}
        </button>
        {imageId && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || busy}
            className="app-button-secondary inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń obrazek
          </button>
        )}
      </div>

      {imageId && (
        <div className="flex flex-col gap-1">
          <label htmlFor={altInputId} className="text-xs font-medium text-surface-600">
            Opis alternatywny (alt)
          </label>
          <input
            id={altInputId}
            type="text"
            value={imageAlt ?? ''}
            onChange={(e) => onChange({ imageId, imageAlt: e.target.value })}
            maxLength={200}
            placeholder="np. „Portret ciemnowłosego wojownika w zbroi"
            className="app-input rounded-2xl px-3.5 py-2.5 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
