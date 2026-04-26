import {
  DEFAULT_THREAT_TYPES,
  THREAT_TYPE_LABELS,
  type ThreatType,
} from '@modules/fronts/types';
import {
  DEFAULT_LOCATION_TYPES,
  LOCATION_TYPE_LABELS,
  type LocationType,
} from '@modules/locations/types';
import {
  DEFAULT_ITEM_TYPES,
  ITEM_TYPE_LABELS,
  type ItemType,
} from '@modules/items/types';
import {
  DEFAULT_CLUE_TYPES,
  CLUE_TYPE_LABELS,
  type ClueType,
} from '@modules/clues/types';

export type CatalogKey = 'threatType' | 'locationType' | 'itemType' | 'clueType';

export interface CatalogCustomValue {
  id: string;
  label: string;
}

export interface CatalogState {
  disabledDefaults: string[];
  custom: CatalogCustomValue[];
}

export type CampaignCatalogSettings = Record<CatalogKey, CatalogState>;

const STORAGE_PREFIX = 'campaign-catalog-settings:';

function defaults(): CampaignCatalogSettings {
  return {
    threatType: { disabledDefaults: [], custom: [] },
    locationType: { disabledDefaults: [], custom: [] },
    itemType: { disabledDefaults: [], custom: [] },
    clueType: { disabledDefaults: [], custom: [] },
  };
}

export function loadCampaignCatalogSettings(campaignId: string): CampaignCatalogSettings {
  if (typeof localStorage === 'undefined') return defaults();
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${campaignId}`);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<Record<CatalogKey, Partial<CatalogState>>>;
    const out = defaults();
    (Object.keys(out) as CatalogKey[]).forEach((k) => {
      const p = parsed[k];
      if (!p) return;
      out[k].disabledDefaults = Array.isArray(p.disabledDefaults) ? p.disabledDefaults.filter((x) => typeof x === 'string') : [];
      out[k].custom = Array.isArray(p.custom)
        ? p.custom
            .filter((x): x is CatalogCustomValue => !!x && typeof x.id === 'string' && typeof x.label === 'string')
            .map((x) => ({ id: x.id, label: x.label }))
        : [];
    });
    return out;
  } catch {
    return defaults();
  }
}

export function saveCampaignCatalogSettings(campaignId: string, settings: CampaignCatalogSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${STORAGE_PREFIX}${campaignId}`, JSON.stringify(settings));
}

function defaultOptionsFor(key: CatalogKey): { id: string; label: string }[] {
  if (key === 'threatType') {
    return DEFAULT_THREAT_TYPES.map((id) => ({ id, label: THREAT_TYPE_LABELS[id] ?? id }));
  }
  if (key === 'locationType') {
    return DEFAULT_LOCATION_TYPES.map((id) => ({ id, label: LOCATION_TYPE_LABELS[id] ?? id }));
  }
  if (key === 'itemType') {
    return DEFAULT_ITEM_TYPES.map((id) => ({ id, label: ITEM_TYPE_LABELS[id] ?? id }));
  }
  return DEFAULT_CLUE_TYPES.map((id) => ({ id, label: CLUE_TYPE_LABELS[id] ?? id }));
}

export function getActiveCatalogOptions(campaignId: string, key: CatalogKey): { id: string; label: string }[] {
  const s = loadCampaignCatalogSettings(campaignId)[key];
  const disabled = new Set(s.disabledDefaults);
  const base = defaultOptionsFor(key).filter((x) => !disabled.has(x.id));
  return [...base, ...s.custom];
}

export function getCatalogLabelByValue(
  key: CatalogKey,
  value: string | undefined,
  campaignId: string,
): string {
  if (!value) return '—';
  const active = getActiveCatalogOptions(campaignId, key);
  const found = active.find((x) => x.id === value);
  if (found) return found.label;
  const fallbackDefaults = defaultOptionsFor(key).find((x) => x.id === value);
  if (fallbackDefaults) return fallbackDefaults.label;
  return value.startsWith('custom:') ? value.slice('custom:'.length) : value;
}

export type AnyCatalogType = ThreatType | LocationType | ItemType | ClueType;
