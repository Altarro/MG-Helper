import type { AttentionTier } from './types';

export const TIER_LABELS: Record<AttentionTier, string> = {
  0: 'Spokój',
  1: 'W tle',
  2: 'Warto rzucić okiem',
  3: 'Przed sesją',
  4: 'Teraz',
};

export function tierShortLabel(tier: AttentionTier): string {
  return TIER_LABELS[tier];
}
