import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity, EntityType } from '@shared/types';

export function useEntitiesByType(type: EntityType): Entity[] {
  const { db } = useCampaign();
  return (
    useLiveQuery(
      () => db.entities.where('type').equals(type).sortBy('name'),
      [db, type],
    ) ?? []
  );
}
