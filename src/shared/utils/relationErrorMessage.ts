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
        return 'Te wątki są już powiązane w questline. Aby zmienić typ powiązania, usuń starą relację i dodaj ją ponownie.';
      }

      return context.mode === 'parent'
        ? 'Ten wątek nadrzędny jest już podpięty do bieżącego wątku. Aby zmienić typ questline, usuń starą relację i dodaj ją ponownie.'
        : 'Ten wątek jest już podpięty jako element questline. Aby zmienić typ powiązania, usuń starą relację i dodaj ją ponownie.';
    }

    if (context.relationType === 'clues_for') {
      return 'Ta wskazówka już prowadzi do wybranego celu.';
    }

    return 'Taka relacja ju? istnieje.';
  }

  if (error instanceof ContainsParentConflictError) {
    return 'Ten element ma jużinnego rodzica. Najpierw przepnij go lub usuń poprzednią relację.';
  }

  if (error instanceof RelationNotAllowedError) {
    return 'Tych encji nie da sie polaczyc tym typem relacji.';
  }

  if (error instanceof Error) {
    if (error.message.includes('Source entity not found') || error.message.includes('Target entity not found')) {
      return 'Nie udało się zapisać relacji, bo jedna z encji już nie istnieje.';
    }
  }

  return 'Nie udało się zapisać relacji.';
}
