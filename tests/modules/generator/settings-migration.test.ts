import { beforeEach, describe, expect, it } from 'vitest';
import {
  generatorSettingsKeys,
  migrateLegacyGeneratorSettings,
} from '@modules/generator/settingsMigration';

describe('generator settings migration', () => {
  const campaignId = 'camp-settings-migration';

  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy global keys into campaign scoped keys', () => {
    localStorage.setItem('generator-favorite-table-ids', JSON.stringify(['a', 'b']));
    localStorage.setItem('generator-auto-save-history', 'false');
    localStorage.setItem('generator-tag-input', 'legacy-tag');
    localStorage.setItem('generator-seed', 'legacy-seed');
    localStorage.setItem('generator-onboarding-dismissed', '1');

    const changed = migrateLegacyGeneratorSettings(campaignId);
    expect(changed).toBe(true);

    expect(localStorage.getItem(generatorSettingsKeys.favoriteTableIds(campaignId))).toBe(JSON.stringify(['a', 'b']));
    expect(localStorage.getItem(generatorSettingsKeys.autoSaveHistory(campaignId))).toBe('false');
    expect(localStorage.getItem(generatorSettingsKeys.tagInput(campaignId))).toBe('legacy-tag');
    expect(localStorage.getItem(generatorSettingsKeys.seed(campaignId))).toBe('legacy-seed');
    expect(localStorage.getItem(generatorSettingsKeys.onboardingDismissed(campaignId))).toBe('1');
    expect(localStorage.getItem('generator-favorite-table-ids')).toBeNull();
  });

  it('does not overwrite existing campaign-scoped values', () => {
    localStorage.setItem('generator-favorite-table-ids', JSON.stringify(['legacy']));
    localStorage.setItem(generatorSettingsKeys.favoriteTableIds(campaignId), JSON.stringify(['current']));

    const changed = migrateLegacyGeneratorSettings(campaignId);
    expect(changed).toBe(true);
    expect(localStorage.getItem(generatorSettingsKeys.favoriteTableIds(campaignId))).toBe(JSON.stringify(['current']));
  });
});

