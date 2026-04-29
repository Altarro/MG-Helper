import { describe, expect, it } from 'vitest';
import { getThreatStatus } from '@shared/utils/entityData';
import {
  deriveThreatStatus,
  normalizeThreatLifecycle,
  threatNeedsCleanupReason,
} from '@shared/utils/threatLifecycle';

describe('threat lifecycle helpers', () => {
  it('treats legacy active threats with a death reason as completed', () => {
    expect(deriveThreatStatus('active', undefined, 'Rozbite podczas finalu')).toBe('completed');
    expect(
      getThreatStatus({
        data: {
          threatType: 'dark_entity',
          status: 'active',
          impulse: '',
          moves: [],
          reasonOfDead: 'Rozbite podczas finalu',
        },
      }),
    ).toBe('completed');
  });

  it('clears completion reason when an active threat is saved from the form flow', () => {
    expect(normalizeThreatLifecycle('active', 'Stary powod')).toEqual({
      status: 'active',
      completionReason: '',
    });
  });

  it('marks cleanup as required only when a completed threat has no reason', () => {
    expect(
      threatNeedsCleanupReason({
        status: 'completed',
        reasonOfDead: '',
      }),
    ).toBe(true);
    expect(
      threatNeedsCleanupReason({
        status: 'completed',
        completionReason: '',
        reasonOfDead: '',
      }),
    ).toBe(true);
    expect(
      threatNeedsCleanupReason({
        status: 'completed',
        completionReason: 'Zakończone w sesji',
      }),
    ).toBe(false);
    expect(
      threatNeedsCleanupReason({
        status: 'active',
        reasonOfDead: '',
      }),
    ).toBe(false);
  });
});
