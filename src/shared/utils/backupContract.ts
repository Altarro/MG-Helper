import type { CampaignMeta, Entity, Relation } from '@shared/types';

export const BACKUP_FORMAT_VERSION = 3;

export interface BackupPayload {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  appVersion: string;
  exportedAt: string;
  campaignMeta: CampaignMeta | null;
  entities: Entity[];
  relations: Relation[];
}
