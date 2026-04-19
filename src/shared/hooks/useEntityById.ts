import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity } from '@shared/types';

export function useEntityById(id: string | undefined): Entity | undefined {
  const { db } = useCampaign();
  return useLiveQuery(() => (id ? db.entities.get(id) : undefined), [db, id]);
}
