import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity } from '@shared/types';
import type { Relation } from '@shared/types/relation';

/**
 * Recursively resolves ancestor entities via the `contains` relation.
 * Returns the chain from root → direct parent (closest last).
 * Used for breadcrumbs in TopBar.
 */
export function useAncestors(entityId: string | undefined): Entity[] {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!entityId) return [];

      const ancestors: Entity[] = [];
      let currentId: string | undefined = entityId;

      // Guard against cycles (max 20 levels)
      for (let i = 0; i < 20 && currentId; i++) {
        const parentRel: Relation | undefined = await db.relations
          .where('targetId')
          .equals(currentId)
          .filter((r) => r.type === 'contains')
          .first();

        if (!parentRel) break;

        const parent: Entity | undefined = await db.entities.get(parentRel.sourceId);
        if (!parent) break;

        ancestors.unshift(parent); // prepend to keep root-first order
        currentId = parent.id;
      }

      return ancestors;
    }, [db, entityId]) ?? []
  );
}
