import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isNote } from '../types';
import type { Note } from '../types';

export function useNoteById(id: string | undefined): { note: Note | null | undefined } {
  const { db } = useCampaign();
  const note = useLiveQuery(async () => {
    if (!id) return null;
    const e = await db.entities.get(id);
    if (!e) return null;
    return isNote(e) ? e : null;
  }, [db, id]);
  return { note };
}
