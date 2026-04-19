import type { EntityType, RelationType } from '@shared/types';

interface AllowedRelation {
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
}

/**
 * Defines which (sourceType, targetType) pairs are valid for each RelationType.
 * `addRelation()` in operations.ts enforces these rules.
 *
 * `related_to` is always allowed as a generic fallback — no restriction needed.
 * It should not become the long-term source of truth for the planned
 * Thread <-> Threat narrative contract.
 */
export const RELATION_RULES: Record<RelationType, AllowedRelation | 'any'> = {
  contains: {
    sourceTypes: ['location'],
    targetTypes: ['location', 'npc', 'item', 'threat'],
  },
  belongs_to: {
    sourceTypes: ['threat', 'npc', 'location'],
    targetTypes: ['front', 'faction'],
  },
  tracks: {
    sourceTypes: ['threat'],
    targetTypes: ['clock'],
  },
  appears_in: {
    sourceTypes: ['npc', 'location', 'item', 'thread', 'note', 'clue', 'clock', 'event', 'threat'],
    targetTypes: ['session'],
  },
  owns: {
    sourceTypes: ['npc'],
    targetTypes: ['item'],
  },
  related_to: 'any',
  clues_for: {
    sourceTypes: ['clue'],
    targetTypes: ['threat', 'front', 'thread'],
  },
  derives_from: {
    sourceTypes: ['thread'],
    targetTypes: ['thread'],
  },
  affects: {
    sourceTypes: ['thread', 'threat'],
    targetTypes: ['thread', 'threat'],
  },
};

export function isRelationAllowed(
  sourceType: EntityType,
  targetType: EntityType,
  relationType: RelationType,
): boolean {
  const rule = RELATION_RULES[relationType];
  if (rule === 'any') return true;

  if (relationType === 'affects') {
    return (
      (sourceType === 'thread' && targetType === 'threat') ||
      (sourceType === 'threat' && targetType === 'thread')
    );
  }

  return rule.sourceTypes.includes(sourceType) && rule.targetTypes.includes(targetType);
}
