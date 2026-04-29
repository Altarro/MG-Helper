import type { Entity } from '@shared/types/entity';
import type { LifecycleStatus } from '@shared/types/entityLifecycle';

export const DEFAULT_ITEM_TYPES = [
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
export const ITEM_TYPES = DEFAULT_ITEM_TYPES;
export type DefaultItemType = (typeof DEFAULT_ITEM_TYPES)[number];
export type ItemType = DefaultItemType | `custom:${string}`;
export const ITEM_TYPE_LABELS: Record<string, string> = {
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

export function getItemTypeLabel(itemType: ItemType): string {
  if ((ITEM_TYPES as readonly string[]).includes(itemType)) {
    return ITEM_TYPE_LABELS[itemType as DefaultItemType] ?? itemType;
  }
  return itemType.startsWith('custom:') ? itemType.slice('custom:'.length) : itemType;
}

export interface ItemData {
  itemType: ItemType;
  properties: string[]; // e.g. ["sharp", "magical", "heavy"]
  /** Stan fabularny (`completed` = zniszczony/zgubiony; encja zostaje w kampanii). */
  status?: LifecycleStatus;
  lifecycleReason?: string;
  imageId?: string | null; // reference to Asset (cover blob)
  imageAlt?: string;
}

export type Item = Entity & { type: 'item'; data: ItemData };

export function isItem(entity: Entity): entity is Item {
  return entity.type === 'item';
}
