import type { Relation } from '@shared/types';

export type RelationIdentity = Pick<Relation, 'sourceId' | 'targetId' | 'type' | 'label'>;

export function normalizeRelationLabel(label?: string): string | undefined {
  const normalized = label?.trim();
  return normalized ? normalized : undefined;
}

export function getRelationIntegrityKey(relation: RelationIdentity): string {
  return [
    relation.type,
    relation.sourceId,
    relation.targetId,
    normalizeRelationLabel(relation.label) ?? '',
  ].join('::');
}

export function findDuplicateRelation(
  existingRelations: RelationIdentity[],
  relation: RelationIdentity,
): RelationIdentity | undefined {
  const key = getRelationIntegrityKey(relation);
  return existingRelations.find((candidate) => getRelationIntegrityKey(candidate) === key);
}

export function findContainsParentConflict(
  existingRelations: RelationIdentity[],
  relation: RelationIdentity,
): RelationIdentity | undefined {
  if (relation.type !== 'contains') return undefined;

  return existingRelations.find(
    (candidate) =>
      candidate.type === 'contains' &&
      candidate.targetId === relation.targetId &&
      candidate.sourceId !== relation.sourceId,
  );
}
