import type { Entity } from '@shared/types/entity';

export const CLUE_TYPES = ['character', 'location', 'event'] as const;
export type ClueType = (typeof CLUE_TYPES)[number];

export const CLUE_TYPE_LABELS: Record<string, string> = {
  character: 'Postać',
  location: 'Lokacja',
  event: 'Zdarzenie',
};

export interface ClueData {
  // Clue is an atomic piece of information. It may stay free or point to a story object.
  clueType: ClueType;
  hint: string;
  discovered: boolean;
}

export type Clue = Entity & { type: 'clue'; data: ClueData };

export function isClue(entity: Entity): entity is Clue {
  return entity.type === 'clue';
}
