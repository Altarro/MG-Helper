import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Relation } from '@shared/types/relation';
import { isClue } from '../types';
import type { Clue } from '../types';

export interface ClueRelationItem {
  clue: Clue;
  relation: Relation;
}

/**
 * Returns all clues that have a `clues_for` relation pointing to parentId
 * together with the relation metadata used by narrative UI.
 */
export function useCluesFor(parentId: string | undefined): ClueRelationItem[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!parentId) return [];
    const rels = await db.relations
      .where('targetId').equals(parentId)
      .filter((r) => r.type === 'clues_for')
      .toArray();
    const entities = await Promise.all(
      rels.map(async (relation) => {
        const entity = await db.entities.get(relation.sourceId);
        if (!entity || !isClue(entity)) return null;
        return { clue: entity, relation };
      }),
    );
    return entities
      .filter((item): item is ClueRelationItem => !!item)
      .sort((a, b) => a.clue.name.localeCompare(b.clue.name, 'pl'));
  }, [db, parentId]);
}
