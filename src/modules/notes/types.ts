import type { Entity } from '@shared/types/entity';

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
