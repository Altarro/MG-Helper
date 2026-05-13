import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isRegularNote } from '../types';
import type { Note } from '../types';

/** Notes for a specific session, sorted by createdAt desc */
export function useNotesBySession(sessionId: string): Note[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('note').toArray();
    return all
      .filter(isRegularNote)
      .filter((n) => n.data.sessionId === sessionId)
      .sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
  }, [db, sessionId]);
}
