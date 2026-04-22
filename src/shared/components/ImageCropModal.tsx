import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { getCroppedImageBlob } from '@shared/utils/cropImage';

import 'react-easy-crop/react-easy-crop.css';

type CropTab = 'full' | 'thumb';

interface TabState {
  crop: { x: number; y: number };
  zoom: number;
  pixels: Area | null;
}

const INITIAL_TAB: TabState = {
  crop: { x: 0, y: 0 },
  zoom: 1,
  pixels: null,
};

export interface ImageCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onConfirm: (pair: { full: Blob; thumb: Blob }) => void | Promise<void>;
}

/**
 * Dwa niezależne kadry 1×1: **Pełny** (zapis do głównego WebP w assetcie) oraz **Miniaturka**
 * (osobny blob miniatury używany na listach). Oba wymagane przed „Zastosuj”.
 */
export function ImageCropModal({ imageSrc, onClose, onConfirm }: ImageCropModalProps) {
  const [tab, setTab] = useState<CropTab>('full');
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [full, setFull] = useState<TabState>(INITIAL_TAB);
  const [thumb, setThumb] = useState<TabState>(INITIAL_TAB);
  const [applying, setApplying] = useState(false);

  const active = tab === 'full' ? full : thumb;
  const patchActive = useCallback((patch: Partial<TabState>) => {
    const t = tabRef.current;
    if (t === 'full') setFull((s) => ({ ...s, ...patch }));
    else setThumb((s) => ({ ...s, ...patch }));
  }, []);

  useEffect(() => {
    setFull(INITIAL_TAB);
    setThumb(INITIAL_TAB);
    setTab('full');
  }, [imageSrc]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    const t = tabRef.current;
    if (t === 'full') setFull((s) => ({ ...s, pixels: areaPixels }));
    else setThumb((s) => ({ ...s, pixels: areaPixels }));
  }, []);

  const bothReady = Boolean(full.pixels && thumb.pixels);

  async function handleConfirm() {
    if (!full.pixels || !thumb.pixels || applying) return;
    setApplying(true);
    let fullBlob: Blob;
    let thumbBlob: Blob;
    try {
      fullBlob = await getCroppedImageBlob(imageSrc, full.pixels);
    } catch (err) {
      console.error('Crop full failed', err);
      toast.error('Nie udało się wyciąć kadru „Pełny”');
      setApplying(false);
      return;
    }
    try {
      thumbBlob = await getCroppedImageBlob(imageSrc, thumb.pixels);
    } catch (err) {
      console.error('Crop thumb failed', err);
      toast.error('Nie udało się wyciąć kadru „Miniaturka”');
      setApplying(false);
      return;
    }
    try {
      await onConfirm({ full: fullBlob, thumb: thumbBlob });
    } catch (err) {
      console.error('After-crop save failed', err);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal title="Dopasuj kadr" size="lg" onClose={onClose}>
      <p className="text-surface-600 mb-3 text-sm">
        Ustaw <strong className="font-medium text-surface-800">dwa kwadratowe</strong> kadry (1:1).
        <strong className="font-medium text-surface-800"> Miniaturka</strong> trafia na listy encji,{' '}
        <strong className="font-medium text-surface-800">Pełny</strong> — do podglądu po kliknięciu
        miniatury w szczegółach.
      </p>

      <div className="mb-4 flex rounded-2xl border border-surface-200/90 bg-surface-900/[0.03] p-1">
        <button
          type="button"
          disabled={applying}
          onClick={() => setTab('full')}
          className={`min-h-[2.75rem] flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            tab === 'full'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-surface-700 hover:bg-white/70'
          }`}
        >
          Pełny
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={() => setTab('thumb')}
          className={`min-h-[2.75rem] flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            tab === 'thumb'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-surface-700 hover:bg-white/70'
          }`}
        >
          Miniaturka
        </button>
      </div>

      <p className="text-surface-500 mb-3 text-xs">
        Edytujesz:{' '}
        <span className="font-medium text-surface-700">
          {tab === 'full' ? 'Pełny obraz (klik w miniaturę w detalu)' : 'Miniaturka na listach'}
        </span>
        {!full.pixels || !thumb.pixels ? (
          <span className="text-surface-400"> — ustaw oba kadry przed zapisem.</span>
        ) : null}
      </p>

      <div className="relative mb-4 h-[min(55vh,22rem)] w-full overflow-hidden rounded-2xl bg-surface-900/10">
        <Cropper
          key={`${imageSrc}-${tab}`}
          image={imageSrc}
          crop={active.crop}
          zoom={active.zoom}
          aspect={1}
          onCropChange={(c) => patchActive({ crop: c })}
          onZoomChange={(z) => patchActive({ zoom: z })}
          onCropComplete={onCropComplete}
          showGrid={false}
          restrictPosition
        />
      </div>

      <div className="mb-5 flex flex-col gap-2">
        <label className="text-surface-700 text-xs font-medium" htmlFor="image-crop-zoom">
          Przybliżenie ({tab === 'full' ? 'pełny' : 'miniaturka'})
        </label>
        <input
          id="image-crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={active.zoom}
          onChange={(e) => patchActive({ zoom: Number(e.target.value) })}
          className="accent-primary-600 w-full"
          disabled={applying}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={applying}
          className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!bothReady || applying}
          className="app-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Zapisywanie…
            </>
          ) : (
            'Zastosuj'
          )}
        </button>
      </div>
    </Modal>
  );
}
