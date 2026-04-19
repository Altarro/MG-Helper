export const ENTITY_TYPES = [
  'npc',
  'location',
  'front',
  'threat',
  'clock',
  'session',
  'faction',
  'item',
  'clue',
  'thread',
  'note',
  'event',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string; // sanitized HTML from Tiptap
  tags: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  data: Record<string, unknown>; // module-specific extra fields
}

export type NewEntity = Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>;
export type EntityUpdate = Partial<Omit<Entity, 'id' | 'type' | 'createdAt'>>;
