import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClue } from '../types';
import type { Clue } from '../types';

/** Reactive list of all Clue entities, sorted by name */
export function useClues(): Clue[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('clue').sortBy('name');
    return all.filter(isClue);
  }, [db]);
}
