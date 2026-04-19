import type { Entity } from '@shared/types/entity';

export const ITEM_TYPES = [
  'weapon',
  'armor',
  'tool',
  'artifact',
  'scroll',
  'potion',
  'key',
  'currency',
  'misc',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Broń',
  armor: 'Zbroja',
  tool: 'Narzędzie',
  artifact: 'Artefakt',
  scroll: 'Zwój',
  potion: 'Mikstura',
  key: 'Klucz',
  currency: 'Waluta',
  misc: 'Inne',
};

export interface ItemData {
  itemType: ItemType;
  properties: string[]; // e.g. ["sharp", "magical", "heavy"]
}

export type Item = Entity & { type: 'item'; data: ItemData };

export function isItem(entity: Entity): entity is Item {
  return entity.type === 'item';
}
