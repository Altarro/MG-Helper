import Dexie from 'dexie';
import { listCampaigns, saveCampaign } from './campaignStore';
import { openCampaignDb } from './database';
import type { CampaignMeta } from '@shared/types/campaign';

const LEGACY_DB_NAME = 'mg-helper';
const LEGACY_CAMPAIGN_ID = 'legacy';

/**
 * Checks if the legacy `mg-helper` database exists and no campaigns are registered.
 * If so, creates a `CampaignMeta` entry that points to the same underlying DB.
 *
 * Returns `true` if migration was performed, `false` otherwise.
 */
export async function migrateLegacyDb(): Promise<boolean> {
  const campaigns = listCampaigns();
  if (campaigns.length > 0) return false; // already migrated or fresh start

  const exists = await Dexie.exists(LEGACY_DB_NAME);
  if (!exists) return false;

  const meta: CampaignMeta = {
    id: LEGACY_CAMPAIGN_ID,
    name: 'Moja kampania',
    description: '',
    createdAt: new Date().toISOString(),
  };

  saveCampaign(meta);
  // Pre-open the DB under the legacy campaign id, reusing the same underlying DB name
  openCampaignDb(LEGACY_CAMPAIGN_ID, LEGACY_DB_NAME);

  return true;
}
