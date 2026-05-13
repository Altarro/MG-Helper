import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isRegularNote } from '../types';
import type { Note } from '../types';

/** All notes sorted by createdAt desc */
export function useNotes(): Note[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('note').toArray();
    return all
      .filter(isRegularNote)
      .sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
  }, [db]);
}
