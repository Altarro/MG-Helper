import type { Entity } from '@shared/types/entity';

export interface FactionData {
  goals: string[];      // faction goals/objectives
  resources: string[]; // resources, assets
}

export type Faction = Entity & { type: 'faction'; data: FactionData };

export function isFaction(entity: Entity): entity is Faction {
  return entity.type === 'faction';
}
