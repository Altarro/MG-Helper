import type { Entity } from '@shared/types/entity';

export const BACKSTAGE_SCENARIO_NOTE_KIND = 'backstage_scenario';

export interface NoteData {
  [key: string]: unknown;
  content: string;
  sessionId: string;
  createdAt: string;
  cleanupDecision?: 'keep' | 'archive' | 'delete' | 'pending';
  cleanupDecidedAt?: string;
}

export interface Note extends Entity {
  type: 'note';
  data: NoteData;
}

export function isNote(entity: Entity): entity is Note {
  return entity.type === 'note';
}

export function isBackstageScenarioNote(entity: Entity): entity is Note {
  return isNote(entity) && entity.data.kind === BACKSTAGE_SCENARIO_NOTE_KIND;
}

export function isRegularNote(entity: Entity): entity is Note {
  return isNote(entity) && entity.data.kind !== BACKSTAGE_SCENARIO_NOTE_KIND;
}
