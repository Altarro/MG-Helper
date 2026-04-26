import {
  DEFAULT_RADAR_ARCHETYPE,
  DEFAULT_RADAR_ARCHETYPES,
  type RadarArchetype,
} from '@modules/fronts/types';
import {
  THREAT_RADAR_DEFAULT_WEIGHTS,
  THREAT_RADAR_WEIGHT_KEYS,
  type ThreatRadarArchetypeWeights,
} from './engine/threatRadarArchetypes';

export type ThreatRadarWeightsConfig = Record<string, ThreatRadarArchetypeWeights>;
export type ThreatRadarCustomLabels = Record<string, string>;

export interface ThreatRadarSettings {
  weights: ThreatRadarWeightsConfig;
  customLabels: ThreatRadarCustomLabels;
}

function key(campaignId: string): string {
  return `threat-radar-settings:${campaignId}`;
}

export function getDefaultThreatRadarWeights(): ThreatRadarWeightsConfig {
  return JSON.parse(JSON.stringify(THREAT_RADAR_DEFAULT_WEIGHTS)) as Record<string, ThreatRadarArchetypeWeights>;
}

function normalizePartial(
  input: Partial<Record<string, Partial<Record<(typeof THREAT_RADAR_WEIGHT_KEYS)[number], unknown>>>>,
): ThreatRadarWeightsConfig {
  const out = getDefaultThreatRadarWeights() as ThreatRadarWeightsConfig;
  for (const archetype of Object.keys(input)) {
    const candidate = input[archetype];
    if (!candidate) continue;
    const isDefault = (DEFAULT_RADAR_ARCHETYPES as readonly string[]).includes(archetype);
    if (!isDefault && !archetype.startsWith('custom:')) continue;
    if (!out[archetype]) {
      out[archetype] = {
        footprintAbsence: 0.01,
        sinceClock: 0.01,
        threadOpen: 0.01,
        clueDebt: 0.01,
        clockFill: 0.01,
      };
    }
    for (const weightKey of THREAT_RADAR_WEIGHT_KEYS) {
      const raw = candidate[weightKey];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
      out[archetype][weightKey] = Math.max(0, Math.min(1, raw));
    }
  }
  return out;
}

function normalizeLabels(input: unknown): ThreatRadarCustomLabels {
  if (!input || typeof input !== 'object') return {};
  const out: ThreatRadarCustomLabels = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!k.startsWith('custom:')) continue;
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    out[k] = trimmed;
  }
  return out;
}

export function loadThreatRadarSettings(campaignId: string): ThreatRadarSettings {
  if (typeof localStorage === 'undefined') {
    return {
      weights: getDefaultThreatRadarWeights(),
      customLabels: {},
    };
  }
  try {
    const raw = localStorage.getItem(key(campaignId));
    if (!raw) {
      return {
        weights: getDefaultThreatRadarWeights(),
        customLabels: {},
      };
    }
    const parsed = JSON.parse(raw) as {
      weights?: Partial<Record<string, Partial<Record<(typeof THREAT_RADAR_WEIGHT_KEYS)[number], unknown>>>>;
      customLabels?: unknown;
      [key: string]: unknown;
    };
    const legacyWeights =
      parsed.weights ??
      (parsed && typeof parsed === 'object' ? (parsed as Partial<Record<string, Partial<Record<(typeof THREAT_RADAR_WEIGHT_KEYS)[number], unknown>>>>) : {});
    return {
      weights: normalizePartial(legacyWeights),
      customLabels: normalizeLabels(parsed.customLabels),
    };
  } catch {
    return {
      weights: getDefaultThreatRadarWeights(),
      customLabels: {},
    };
  }
}

export function loadThreatRadarWeights(campaignId: string): ThreatRadarWeightsConfig {
  return loadThreatRadarSettings(campaignId).weights;
}

export function saveThreatRadarSettings(campaignId: string, cfg: ThreatRadarSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    key(campaignId),
    JSON.stringify({
      weights: normalizePartial(cfg.weights),
      customLabels: normalizeLabels(cfg.customLabels),
    }),
  );
}

export function saveThreatRadarWeights(campaignId: string, cfg: ThreatRadarWeightsConfig): void {
  const current = loadThreatRadarSettings(campaignId);
  saveThreatRadarSettings(campaignId, { ...current, weights: cfg });
}

export function getAllRadarArchetypes(campaignId: string): RadarArchetype[] {
  const settings = loadThreatRadarSettings(campaignId);
  const custom = Object.keys(settings.customLabels).filter((k) => k.startsWith('custom:'));
  return [...DEFAULT_RADAR_ARCHETYPES, ...custom] as RadarArchetype[];
}

export function getRadarArchetypeLabel(
  archetype: RadarArchetype | undefined,
  campaignId: string,
): string {
  const id = archetype ?? DEFAULT_RADAR_ARCHETYPE;
  const settings = loadThreatRadarSettings(campaignId);
  if (id.startsWith('custom:')) return settings.customLabels[id] ?? id.replace(/^custom:/, '');
  const defaults: Record<string, string> = {
    living_world: 'Żyjący świat',
    mystery: 'Tajemnica',
    predator: 'Drapieżnik',
    ambush: 'Zasadzka',
    avalanche: 'Lawina',
  };
  return defaults[id] ?? 'Żyjący świat';
}

