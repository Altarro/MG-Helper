import type { EntityType } from '@shared/types/entity';

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  npc: 'NPC',
  location: 'Lokacja',
  front: 'Front',
  threat: 'Zagrożenie',
  clock: 'Zegar',
  session: 'Sesja',
  faction: 'Frakcja',
  item: 'Przedmiot',
  clue: 'Wskazówka',
  thread: 'Wątek',
  note: 'Notatka',
  event: 'Zdarzenie',
};

export const ENTITY_TYPE_BADGE_CLASSES: Record<EntityType, string> = {
  npc: 'bg-blue-50 text-blue-700 ring-blue-200',
  location: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  front: 'bg-rose-50 text-rose-700 ring-rose-200',
  threat: 'bg-orange-50 text-orange-700 ring-orange-200',
  clock: 'bg-purple-50 text-purple-700 ring-purple-200',
  session: 'bg-amber-50 text-amber-700 ring-amber-200',
  faction: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  item: 'bg-teal-50 text-teal-700 ring-teal-200',
  clue: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  thread: 'bg-violet-50 text-violet-700 ring-violet-200',
  note: 'bg-stone-100 text-stone-700 ring-stone-200',
  event: 'bg-pink-50 text-pink-700 ring-pink-200',
};

export function getEntityTypeLabel(type: EntityType): string {
  return ENTITY_TYPE_LABELS[type];
}

export function getEntityTypeBadgeClasses(type: EntityType): string {
  return ENTITY_TYPE_BADGE_CLASSES[type];
}

export function getEntityDetailPath(type: EntityType, id: string): string | null {
  switch (type) {
    case 'npc':
      return `/npcs/${id}`;
    case 'location':
      return `/locations/${id}`;
    case 'front':
      return `/fronts/${id}`;
    case 'threat':
      return `/threats/${id}`;
    case 'clock':
      return `/clocks/${id}`;
    case 'session':
      return `/sessions/${id}`;
    case 'faction':
      return `/factions/${id}`;
    case 'item':
      return `/items/${id}`;
    case 'clue':
      return `/clues/${id}`;
    case 'thread':
      return `/threads/${id}`;
    case 'note':
      return `/notes/${id}`;
    default:
      return null;
  }
}
