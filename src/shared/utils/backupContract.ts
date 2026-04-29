import type { CampaignMeta, Entity, Relation } from '@shared/types';
import type { GeneratorPackRecord, GeneratorRollLogRecord } from '@shared/types/generator';

export const BACKUP_FORMAT_VERSION = 3;

export interface BackupPayload {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  appVersion: string;
  exportedAt: string;
  campaignMeta: CampaignMeta | null;
  entities: Entity[];
  relations: Relation[];
  generatorPacks: GeneratorPackRecord[];
  generatorRollLogs: GeneratorRollLogRecord[];
}
