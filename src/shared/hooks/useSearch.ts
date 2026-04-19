import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isNpcLocationHistoryEvent } from '@modules/npcs/types';
import { stripHtml } from '@shared/utils/sanitize';
import { useDebounce } from './useDebounce';
import type { Entity } from '@shared/types';

/** Fulltext search across name, tags, and stripped description. Debounced 300 ms. */
export function useSearch(query: string): Entity[] {
  const { db } = useCampaign();
  const debounced = useDebounce(query.trim().toLowerCase(), 300);

  return (
    useLiveQuery(async () => {
      if (!debounced) return [];
      const all = await db.entities.toArray();
      return all.filter((e) => {
        if (isNpcLocationHistoryEvent(e)) return false;
        const haystack = [
          e.name,
          ...e.tags,
          stripHtml(e.description),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(debounced);
      });
    }, [db, debounced]) ?? []
  );
}
