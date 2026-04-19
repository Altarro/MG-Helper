import { useCallback, useEffect, useRef, useState } from 'react';
import { updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import type { EntityUpdate } from '@shared/types';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave (1000 ms) + immediate save on blur.
 * Returns `status` for displaying "Zapisuję…" / "Zapisano" indicators.
 */
export function useAutosave(
  entityId: string | undefined,
  field: 'name' | 'description',
  content: string,
): { status: AutosaveStatus; saveNow: () => Promise<void> } {
  const { db } = useCampaign();
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef(content);
  latestContent.current = content;

  const saveNow = useCallback(async () => {
    if (!entityId) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('saving');
    try {
      const changes: Pick<EntityUpdate, 'name' | 'description'> =
        field === 'name'
          ? { name: latestContent.current }
          : { description: latestContent.current };
      await updateEntity(db, entityId, changes);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [db, entityId, field]);

  useEffect(() => {
    if (!entityId) return;
    timerRef.current = setTimeout(() => void saveNow(), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, entityId, saveNow]);

  return { status, saveNow };
}
