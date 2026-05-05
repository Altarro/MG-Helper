import type { RadarArchetype } from '@modules/fronts/types';

export const THREAT_RADAR_WEIGHT_KEYS = [
  'footprintAbsence',
  'sinceClock',
  'threadOpen',
  'clueDebt',
  'clockFill',
] as const;
export type ThreatRadarWeightKey = (typeof THREAT_RADAR_WEIGHT_KEYS)[number];
export type ThreatRadarArchetypeWeights = Record<ThreatRadarWeightKey, number>;

/**
 * Wagi pod architekturę radaru — suma składowych nie musi być 1; wynik i tak się `clamp01`.
 * `footprintAbsence` mnoży (1 − obecność śladu na ostatnich sesjach).
 * Do strojenia po playteście.
 */
export const THREAT_RADAR_ARCHETYPE_WEIGHTS: Record<RadarArchetype, ThreatRadarArchetypeWeights> = {
  living_world: {
    footprintAbsence: 0.38,
    sinceClock: 0.12,
    threadOpen: 0.22,
    clueDebt: 0.15,
    clockFill: 0.13,
  },
  mystery: {
    footprintAbsence: 0.12,
    sinceClock: 0.15,
    threadOpen: 0.2,
    clueDebt: 0.38,
    clockFill: 0.15,
  },
  predator: {
    footprintAbsence: 0.12,
    sinceClock: 0.18,
    threadOpen: 0.18,
    clueDebt: 0.4,
    clockFill: 0.22,
  },
  ambush: {
    footprintAbsence: 0.22,
    sinceClock: 0.36,
    threadOpen: 0.18,
    clueDebt: 0.16,
    clockFill: 0.1,
  },
  avalanche: {
    footprintAbsence: 0.08,
    sinceClock: 0.14,
    threadOpen: 0.12,
    clueDebt: 0.1,
    clockFill: 0.56,
  },
};

export const THREAT_RADAR_DEFAULT_WEIGHTS = THREAT_RADAR_ARCHETYPE_WEIGHTS;
