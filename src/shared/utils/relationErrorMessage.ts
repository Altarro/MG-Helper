import {
  ContainsParentConflictError,
  DuplicateRelationError,
  RelationNotAllowedError,
} from '@shared/db/operations';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';

interface RelationErrorContext {
  relationType?: RelationType;
  sourceType?: EntityType;
  targetType?: EntityType;
  mode?: 'parent' | 'child';
}

export function getReadableRelationErrorMessage(
  error: unknown,
  context: RelationErrorContext = {},
): string {
  if (error instanceof DuplicateRelationError) {
    if (
      context.relationType === 'derives_from' &&
      context.sourceType === 'thread' &&
      context.targetType === 'thread'
    ) {
      if (!context.mode) {
        return 'Te w?tki s? ju? powi?zane w questline. Aby zmieni? typ powi?zania, usu? star? relacj? i dodaj j? ponownie.';
      }

      return context.mode === 'parent'
        ? 'Ten w?tek nadrz?dny jest ju? podpi?ty do bie??cego w?tku. Aby zmieni? typ questline, usu? star? relacj? i dodaj j? ponownie.'
        : 'Ten w?tek jest ju? podpi?ty jako element questline. Aby zmieni? typ powi?zania, usu? star? relacj? i dodaj j? ponownie.';
    }

    if (context.relationType === 'clues_for') {
      return 'Ta wskaz?wka ju? prowadzi do wybranego celu.';
    }

    return 'Taka relacja ju? istnieje.';
  }

  if (error instanceof ContainsParentConflictError) {
    return 'Ten element ma ju? innego rodzica. Najpierw przepnij go lub usu? poprzedni? relacj?.';
  }

  if (error instanceof RelationNotAllowedError) {
    return 'Tych encji nie da sie polaczyc tym typem relacji.';
  }

  if (error instanceof Error) {
    if (error.message.includes('Source entity not found') || error.message.includes('Target entity not found')) {
      return 'Nie uda?o si? zapisa? relacji, bo jedna z encji ju? nie istnieje.';
    }
  }

  return 'Nie uda?o si? zapisa? relacji.';
}
