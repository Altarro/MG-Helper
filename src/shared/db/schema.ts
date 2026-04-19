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
 */
export const DB_NAME = 'mg-helper';
export const DB_VERSION = 1;

export const SCHEMA = {
  // &id — primary key; *tags — multi-entry index for tag-based queries
  entities: '&id, type, name, *tags, updatedAt',
  relations: '&id, sourceId, targetId, type',
} as const;
