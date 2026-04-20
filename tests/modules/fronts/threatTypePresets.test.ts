import { describe, expect, it } from 'vitest';
import { THREAT_TYPES, THREAT_TYPE_PRESETS } from '@modules/fronts/types';

describe('THREAT_TYPE_PRESETS', () => {
  it('provides non-empty defaults for every threat type', () => {
    for (const threatType of THREAT_TYPES) {
      const preset = THREAT_TYPE_PRESETS[threatType];
      expect(preset).toBeDefined();
      expect(preset.impulse.trim().length).toBeGreaterThan(0);
      expect(preset.trigger.trim().length).toBeGreaterThan(0);
      expect(preset.moves.length).toBeGreaterThan(0);
      expect(preset.moves.every((move) => move.trim().length > 0)).toBe(true);
    }
  });
});
