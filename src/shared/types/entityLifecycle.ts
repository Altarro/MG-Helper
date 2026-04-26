import type { Entity } from './entity';

/**
 * Wspólny cykl fabularny encji (bez usuwania z bazy): aktywna vs zakończona.
 * Zgodny semantycznie ze statusem zagrożenia / wątku (`active` | `completed`).
 */
export const LIFECYCLE_STATUSES = ['active', 'completed'] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  active: 'Aktywne',
  completed: 'Zakończone',
};

export function deriveLifecycleStatus(explicit?: LifecycleStatus): LifecycleStatus {
  if (explicit === 'completed' || explicit === 'active') return explicit;
  return 'active';
}

const LEGACY_LIFECYCLE_DATA_KEYS = ['isDead', 'isDestroyed', 'isDisbanded'] as const;

/** Zapis: ustaw `status` i usuń ewentualne przestarzałe pola bool z `data`. */
export function withLifecycleStatus<T extends object>(
  base: T,
  next: LifecycleStatus,
): T & { status: LifecycleStatus } {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>), status: next };
  for (const k of LEGACY_LIFECYCLE_DATA_KEYS) delete out[k];
  return out as T & { status: LifecycleStatus };
}

const LIFECYCLE_ENTITY_TYPES = new Set<Entity['type']>(['npc', 'location', 'item', 'faction']);

/**
 * Po imporcie backupu: usuwa ewentualne przestarzałe klucze z JSON-a
 * i ustawia domyślny `status`, jeśli brak lub wartość jest niepoprawna.
 */
export function normalizeImportedEntityLifecycle(entity: Entity): Entity {
  if (!LIFECYCLE_ENTITY_TYPES.has(entity.type)) return entity;

  const data = { ...(entity.data as Record<string, unknown>) };
  delete data.isDead;
  delete data.isDestroyed;
  delete data.isDisbanded;

  const s = data.status;
  if (s !== 'active' && s !== 'completed') {
    data.status = 'active';
  }

  return { ...entity, data };
}
