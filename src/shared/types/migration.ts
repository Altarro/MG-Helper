export type MigrationBackupKind = 'generator_repair' | 'db_upgrade_v5';

export interface MigrationBackupRecord {
  id: string;
  campaignId: string;
  kind: MigrationBackupKind;
  createdAt: string;
  payload: unknown;
}
