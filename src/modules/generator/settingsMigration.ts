const LEGACY_KEYS = {
  favoriteTableIds: 'generator-favorite-table-ids',
  autoSaveHistory: 'generator-auto-save-history',
  tagInput: 'generator-tag-input',
  seed: 'generator-seed',
  onboardingDismissed: 'generator-onboarding-dismissed',
} as const;

export const generatorSettingsKeys = {
  favoriteTableIds: (campaignId: string) => `generator-favorite-table-ids:${campaignId}`,
  autoSaveHistory: (campaignId: string) => `generator-auto-save-history:${campaignId}`,
  tagInput: (campaignId: string) => `generator-tag-input:${campaignId}`,
  seed: (campaignId: string) => `generator-seed:${campaignId}`,
  onboardingDismissed: (campaignId: string) => `generator-onboarding-dismissed:${campaignId}`,
};

function migrateKey(legacyKey: string, nextKey: string) {
  const value = localStorage.getItem(legacyKey);
  if (value === null) return false;
  if (localStorage.getItem(nextKey) === null) {
    localStorage.setItem(nextKey, value);
  }
  localStorage.removeItem(legacyKey);
  return true;
}

export function migrateLegacyGeneratorSettings(campaignId: string): boolean {
  let migrated = false;
  migrated = migrateKey(LEGACY_KEYS.favoriteTableIds, generatorSettingsKeys.favoriteTableIds(campaignId)) || migrated;
  migrated = migrateKey(LEGACY_KEYS.autoSaveHistory, generatorSettingsKeys.autoSaveHistory(campaignId)) || migrated;
  migrated = migrateKey(LEGACY_KEYS.tagInput, generatorSettingsKeys.tagInput(campaignId)) || migrated;
  migrated = migrateKey(LEGACY_KEYS.seed, generatorSettingsKeys.seed(campaignId)) || migrated;
  migrated = migrateKey(LEGACY_KEYS.onboardingDismissed, generatorSettingsKeys.onboardingDismissed(campaignId)) || migrated;
  return migrated;
}

