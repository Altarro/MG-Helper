import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { getAsset } from '@shared/db/assets';

export interface UseAssetUrlOptions {
  /** Load the thumbnail blob (≤128 edge) instead of the full-size variant. */
  thumb?: boolean;
}

/**
 * Given an asset id, loads the blob from IndexedDB and exposes a stable
 * `blob:` URL that callers can plug into `<img src>`. The URL is revoked on
 * unmount and whenever the underlying id / variant changes, preventing the
 * "leaking blob URLs" footgun.
 *
 * Returns `null` while loading or when the id is missing.
 */
export function useAssetUrl(
  assetId: string | null | undefined,
  options: UseAssetUrlOptions = {},
): string | null {
  const { db } = useCampaign();
  const { thumb = false } = options;

  const asset = useLiveQuery(
    () => (assetId ? getAsset(db, assetId) : Promise.resolve(undefined)),
    [db, assetId],
  );

  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assetId || !asset) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setUrl(null);
      return;
    }

    const blob = thumb ? asset.thumb?.blob : asset.blob;
    if (!blob) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setUrl(null);
      return;
    }

    const next = URL.createObjectURL(blob);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setUrl(next);

    return () => {
      if (urlRef.current === next) {
        URL.revokeObjectURL(next);
        urlRef.current = null;
      }
    };
  }, [assetId, asset, thumb]);

  return url;
}
