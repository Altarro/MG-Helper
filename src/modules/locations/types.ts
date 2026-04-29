import type { Entity } from '@shared/types/entity';
import type { LifecycleStatus } from '@shared/types/entityLifecycle';

export const DEFAULT_LOCATION_TYPES = [
  'region',
  'city',
  'ruins',
  'dungeon',
  'wilderness',
  'building',
  'room',
] as const;
export const LOCATION_TYPES = DEFAULT_LOCATION_TYPES;

export type DefaultLocationType = (typeof DEFAULT_LOCATION_TYPES)[number];
export type LocationType = DefaultLocationType | `custom:${string}`;

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  region: 'Region',
  city: 'Miasto',
  ruins: 'Ruiny',
  dungeon: 'Lochy',
  wilderness: 'Dzikie tereny',
  building: 'Budynek',
  room: 'Pomieszczenie',
};

export function getLocationTypeLabel(locationType: LocationType): string {
  if ((LOCATION_TYPES as readonly string[]).includes(locationType)) {
    return LOCATION_TYPE_LABELS[locationType as DefaultLocationType] ?? locationType;
  }
  return locationType.startsWith('custom:') ? locationType.slice('custom:'.length) : locationType;
}

export interface LocationSenses {
  see: string;
  hear: string;
  smell: string;
  feel: string;
}

export const EMPTY_LOCATION_SENSES: LocationSenses = {
  see: '',
  hear: '',
  smell: '',
  feel: '',
};

export function createLocationSenses(
  overrides: Partial<LocationSenses> = {},
): LocationSenses {
  return { ...EMPTY_LOCATION_SENSES, ...overrides };
}

export interface LocationData extends Record<string, unknown> {
  locationType: LocationType;
  danger: number; // 0–5
  senses: LocationSenses;
  isDraft?: boolean;
  /** Stan fabularny (`completed` = zniszczona; encja zostaje w kampanii). */
  status?: LifecycleStatus;
  lifecycleReason?: string;
  survivedParentDestruction?: boolean;
  destroyedByParentId?: string | null;
  imageId?: string | null; // reference to Asset (cover blob)
  imageAlt?: string;
}

export function createLocationData(
  overrides: Partial<Omit<LocationData, 'senses'>> & { senses?: Partial<LocationSenses> } = {},
): LocationData {
  const { senses, ...rest } = overrides;
  return {
    locationType: 'region',
    danger: 0,
    senses: createLocationSenses(senses),
    ...rest,
  };
}

export type Location = Entity & { type: 'location'; data: LocationData };

export function isLocation(entity: Entity): entity is Location {
  return entity.type === 'location';
}

export function isDraftLocation(entity: Pick<Entity, 'type' | 'data'> | null | undefined): boolean {
  return !!entity && entity.type === 'location' && entity.data.isDraft === true;
}

export function isNamedLocation(entity: Entity): entity is Location {
  return isLocation(entity) && !isDraftLocation(entity);
}
