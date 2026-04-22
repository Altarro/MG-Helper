import Dexie, { type Table } from 'dexie';
import type { Asset, Entity, Relation } from '@shared/types';
import { DB_VERSION, SCHEMA, SCHEMA_V1 } from './schema';

export class MgHelperDb extends Dexie {
  entities!: Table<Entity, string>;
  relations!: Table<Relation, string>;
  assets!: Table<Asset, string>;

  constructor(dbName: string) {
    super(dbName);
    // v1 — original schema without assets; keep registered so v1 DBs can upgrade cleanly.
    this.version(1).stores(SCHEMA_V1);
    // v2 — adds the `assets` store. Dexie creates the new object store automatically.
    this.version(DB_VERSION).stores(SCHEMA);
  }
}

/** Opens (or returns cached) Dexie instance for a given campaign id. */
const dbCache = new Map<string, MgHelperDb>();

export function openCampaignDb(campaignId: string, customName?: string): MgHelperDb {
  const name = customName ?? `mg-helper-${campaignId}`;
  const cached = dbCache.get(name);
  if (cached) return cached;
  const instance = new MgHelperDb(name);
  dbCache.set(name, instance);
  return instance;
}

export async function deleteCampaignDb(campaignId: string): Promise<void> {
  const name = `mg-helper-${campaignId}`;
  dbCache.delete(name);
  await Dexie.delete(name);
}

/** @deprecated Use CampaignContext instead. Kept for seed.ts and tests only. */
export const db = openCampaignDb('__legacy__', 'mg-helper');
