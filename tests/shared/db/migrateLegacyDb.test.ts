import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { migrateLegacyDb } from '@shared/db/migrateLegacyDb';
import { listCampaigns } from '@shared/db/campaignStore';
import { DB_VERSION, SCHEMA } from '@shared/db/schema';

const LEGACY_DB_NAME = 'mg-helper';

beforeEach(async () => {
  localStorage.clear();
  // Clean up any existing legacy DB
  if (await Dexie.exists(LEGACY_DB_NAME)) {
    await Dexie.delete(LEGACY_DB_NAME);
  }
});

describe('migrateLegacyDb', () => {
  it('returns false and does nothing when no legacy DB exists', async () => {
    const result = await migrateLegacyDb();
    expect(result).toBe(false);
    expect(listCampaigns()).toHaveLength(0);
  });

  it('returns false when campaigns already registered (already migrated)', async () => {
    // Pre-populate campaigns
    localStorage.setItem(
      'mg-campaigns',
      JSON.stringify([{ id: 'existing', name: 'Existing', description: '', createdAt: '' }]),
    );
    // Create legacy DB
    const legacyDb = new Dexie(LEGACY_DB_NAME);
    legacyDb.version(DB_VERSION).stores(SCHEMA);
    await legacyDb.open();
    await legacyDb.close();

    const result = await migrateLegacyDb();
    expect(result).toBe(false);
    // List should still have only the pre-existing campaign
    expect(listCampaigns()).toHaveLength(1);
  });

  it('creates CampaignMeta when legacy DB exists and campaigns list is empty', async () => {
    // Create the legacy DB
    const legacyDb = new Dexie(LEGACY_DB_NAME);
    legacyDb.version(DB_VERSION).stores(SCHEMA);
    await legacyDb.open();
    await legacyDb.close();

    const result = await migrateLegacyDb();
    expect(result).toBe(true);

    const campaigns = listCampaigns();
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.id).toBe('legacy');
    expect(campaigns[0]?.name).toBe('Moja kampania');
  });
});
