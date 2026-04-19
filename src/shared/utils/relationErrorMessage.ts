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
        return 'Te watki sa juz powiazane w questline. Aby zmienic typ powiazania, usun stara relacje i dodaj ja ponownie.';
      }

      return context.mode === 'parent'
        ? 'Ten watek nadrzedny jest juz podpiety do biezacego watku. Aby zmienic typ questline, usun stara relacje i dodaj ja ponownie.'
        : 'Ten watek jest juz podpiety jako element questline. Aby zmienic typ powiazania, usun stara relacje i dodaj ja ponownie.';
    }

    if (context.relationType === 'clues_for') {
      return 'Ta wskazowka juz prowadzi do wybranego celu.';
    }

    return 'Taka relacja juz istnieje.';
  }

  if (error instanceof ContainsParentConflictError) {
    return 'Ten element ma juz innego rodzica. Najpierw przepnij go lub usun poprzednia relacje.';
  }

  if (error instanceof RelationNotAllowedError) {
    return 'Tych encji nie da sie polaczyc tym typem relacji.';
  }

  if (error instanceof Error) {
    if (error.message.includes('Source entity not found') || error.message.includes('Target entity not found')) {
      return 'Nie udalo sie zapisac relacji, bo jedna z encji juz nie istnieje.';
    }
  }

  return 'Nie udalo sie zapisac relacji.';
}
