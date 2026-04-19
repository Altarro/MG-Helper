import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity, EntityType, Relation, RelationType } from '@shared/types';

export interface RelatedEntityItem {
  entity: Entity;
  relation: Relation;
  direction: 'incoming' | 'outgoing';
}

interface UseRelatedEntitiesOptions {
  relationTypes: RelationType[];
  direction?: 'incoming' | 'outgoing' | 'both';
  otherTypes?: EntityType[];
}

export function useRelatedEntities(
  entityId: string | undefined,
  {
    relationTypes,
    direction = 'both',
    otherTypes,
  }: UseRelatedEntitiesOptions,
): RelatedEntityItem[] | undefined {
  const { db } = useCampaign();

  return useLiveQuery(async () => {
    if (!entityId) return [];

    const includeOutgoing = direction === 'both' || direction === 'outgoing';
    const includeIncoming = direction === 'both' || direction === 'incoming';

    const [outgoing, incoming] = await Promise.all([
      includeOutgoing
        ? db.relations.where('sourceId').equals(entityId).toArray()
        : Promise.resolve([]),
      includeIncoming
        ? db.relations.where('targetId').equals(entityId).toArray()
        : Promise.resolve([]),
    ]);

    const related: RelatedEntityItem[] = [];

    for (const relation of outgoing) {
      if (!relationTypes.includes(relation.type)) continue;
      const entity = await db.entities.get(relation.targetId);
      if (!entity) continue;
      if (otherTypes && !otherTypes.includes(entity.type)) continue;
      related.push({ entity, relation, direction: 'outgoing' });
    }

    for (const relation of incoming) {
      if (!relationTypes.includes(relation.type)) continue;
      const entity = await db.entities.get(relation.sourceId);
      if (!entity) continue;
      if (otherTypes && !otherTypes.includes(entity.type)) continue;
      related.push({ entity, relation, direction: 'incoming' });
    }

    related.sort((a, b) => a.entity.name.localeCompare(b.entity.name, 'pl'));
    return related;
  }, [db, entityId, direction, otherTypes?.join('|'), relationTypes.join('|')]);
}
