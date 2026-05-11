import type { Entity } from '@shared/types/entity';
import type { LifecycleStatus } from '@shared/types/entityLifecycle';

export interface FactionData {
  goals: string[];      // faction goals/objectives
  resources: string[]; // resources, assets
  symbols?: string[];   // signs, colors, mottos, marks
  /** Stan fabularny (`completed` = rozbita; encja zostaje w kampanii). */
  status?: LifecycleStatus;
  imageId?: string | null; // reference to Asset (cover blob)
  imageAlt?: string;
}

export type Faction = Entity & { type: 'faction'; data: FactionData };

export function isFaction(entity: Entity): entity is Faction {
  return entity.type === 'faction';
}
