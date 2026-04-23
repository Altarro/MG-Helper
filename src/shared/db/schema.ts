/**
 * Dexie schema definitions.
 *
 * MIGRATION CONVENTION (2.7c):
 * - Bump the version number when you ADD/REMOVE/RENAME indexed columns
 *   (first argument of .stores() — the comma-separated string).
 *   Dexie uses these for IDBKeyRange queries; changing them requires a migration.
 *
 * - Do NOT bump the version for new fields stored inside `entity.data` or
 *   other non-indexed properties. TypeScript types can be extended freely
 *   without touching Dexie's version, because IndexedDB treats them as
 *   opaque blobs.
 *
 * Current indexed columns:
 *   entities: id (PK), type, name, tags (multi-entry), updatedAt
 *   relations: id (PK), sourceId, targetId, type
 *   assets:    id (PK), createdAt
 *
 * Version history:
 *   v1 — entities + relations
 *   v2 — added `assets` table (image blobs referenced from entity.data.imageId)
 *   v3 — added `generatorPacks` table (generator inspiration configuration)
 *   v4 — added `generatorRollLogs` table (generator roll history)
 *   v5 — added `migrationBackups` table (safety snapshots before repairs)
 */
export const DB_NAME = 'mg-helper';
export const DB_VERSION = 5;

export const SCHEMA_V1 = {
  entities: '&id, type, name, *tags, updatedAt',
  relations: '&id, sourceId, targetId, type',
} as const;

export const SCHEMA = {
  ...SCHEMA_V1,
  // &id — primary key; createdAt indexed for orphan cleanup heuristics
  assets: '&id, createdAt',
  generatorPacks: '&id, campaignId, isActive, updatedAt, name',
  generatorRollLogs: '&id, campaignId, sessionId, packId, createdAt',
  migrationBackups: '&id, campaignId, kind, createdAt',
} as const;
