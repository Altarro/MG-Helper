import { APP_VERSION } from '@shared/appInfo';
import type { MgHelperDb } from '@shared/db/database';
import type { CampaignMeta } from '@shared/types';
import { nowISO } from './date';
import { BACKUP_FORMAT_VERSION, type BackupPayload } from './backupContract';

export interface ExportJsonOptions {
  campaignMeta?: CampaignMeta | null;
}

export async function createExportPayload(
  db: MgHelperDb,
  options: ExportJsonOptions = {},
): Promise<BackupPayload> {
  const [entities, relations] = await Promise.all([
    db.entities.toArray(),
    db.relations.toArray(),
  ]);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: nowISO(),
    campaignMeta: options.campaignMeta ?? null,
    entities,
    relations,
  };
}

/** Serializes all entities and relations to a JSON Blob and triggers a download. */
export async function exportJson(
  db: MgHelperDb,
  options: ExportJsonOptions = {},
): Promise<BackupPayload> {
  const payload = await createExportPayload(db, options);
  const serializedPayload = JSON.stringify(payload, null, 2);
  const blob = new Blob([serializedPayload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `mg-helper-backup-${now}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return payload;
}
