import type { Entity } from '@shared/types/entity';

export const FRONT_CATEGORIES = ['campaign', 'adventure'] as const;
export type FrontCategory = (typeof FRONT_CATEGORIES)[number];
export const FRONT_CATEGORY_LABELS: Record<FrontCategory, string> = {
  campaign: 'Kampanijny',
  adventure: 'Przygodowy',
};

export interface FrontData {
  // Front is the strategic campaign container and the highest-level story object.
  category: FrontCategory;
  goal: string;     // primary objective / doom of the front
  stakes: string[]; // list of stake strings
}

export type Front = Entity & { type: 'front'; data: FrontData };

export function isFront(entity: Entity): entity is Front {
  return entity.type === 'front';
}

// ── Threats ──────────────────────────────────────────────────────────────────

export const THREAT_TYPES = [
  'ambitious_organization',
  'arcane_enemy',
  'city',
  'corrupt_ruler',
  'dark_entity',
  'disease_affliction',
  'environ_disaster',
  'force_of_chaos',
  'harmful_tradition',
  'oath_of_service',
  'rampant_beast',
  'region',
  'religious_institution',
  'wealthy_merchant',
] as const;
export type ThreatType = (typeof THREAT_TYPES)[number];
export const THREAT_TYPE_LABELS: Record<ThreatType, string> = {
  ambitious_organization: 'Ambitna organizacja',
  arcane_enemy: 'Wróg magiczny',
  city: 'Miasto',
  corrupt_ruler: 'Skorumpowany władca',
  dark_entity: 'Mroczna istota',
  disease_affliction: 'Choroba / plaga',
  environ_disaster: 'Katastrofa środowiskowa',
  force_of_chaos: 'Siła chaosu',
  harmful_tradition: 'Szkodliwa tradycja',
  oath_of_service: 'Przysięga',
  rampant_beast: 'Dzikie zwierzę',
  region: 'Region',
  religious_institution: 'Instytucja religijna',
  wealthy_merchant: 'Bogaty kupiec',
};

export const THREAT_DEATH_REASON_PRESETS = [
  'pokonane przez bohaterow',
  'wchloniete przez inny front',
  'rozpadlo sie od srodka',
  'utracilo znaczenie po decyzjach stolu',
] as const;

export const THREAT_STATUSES = ['active', 'completed'] as const;
export type ThreatStatus = (typeof THREAT_STATUSES)[number];
export const THREAT_STATUS_LABELS: Record<ThreatStatus, string> = {
  active: 'Aktywne',
  completed: 'Zakończone',
};

export interface ThreatData {
  // Threat is active pressure in the fiction. It may belong to a front or stay free.
  threatType: ThreatType;
  status?: ThreatStatus;
  impulse: string;
  moves: string[]; // list of threat move strings
  trigger?: string;
  reasonOfDead?: string;
  forkThreatId?: string;
}

export type Threat = Entity & { type: 'threat'; data: ThreatData };

export function isThreat(entity: Entity): entity is Threat {
  return entity.type === 'threat';
}
