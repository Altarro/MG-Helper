import { describe, expect, it } from 'vitest';
import { buildDerivedThreatDefaults, buildDerivedThreatDescription, getCompletedClockLabels } from '@modules/fronts/utils/derivedThreat';
import type { Threat } from '@modules/fronts/types';
import type { Clock } from '@modules/clocks/types';

function makeThreat(): Threat {
  return {
    id: 'threat-1',
    type: 'threat',
    name: 'Latarnia pęka pod naporem światła',
    description: '',
    tags: ['latarnia', 'sztorm'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: {
      threatType: 'environ_disaster',
      status: 'completed',
      impulse: 'Rozedrzeć port od środka',
      moves: ['Pierwszy niestabilny błysk', 'Pęknięcie soczewki'],
      reasonOfDead: 'Bohaterowie odcięli zasilanie',
    },
  };
}

function makeClock(): Clock {
  return {
    id: 'clock-1',
    type: 'clock',
    name: 'Latarnia gaśnie po raz trzeci',
    description: '',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: {
      segments: 6,
      filled: 2,
      tickLabels: [
        'Pierwszy niestabilny błysk nad portem',
        'Pęknięcie soczewki i fala paniki',
        'Sygnały wzywające coś spod wody',
      ],
      isActive: false,
    },
  };
}

describe('derived threat helpers', () => {
  it('returns only completed clock labels', () => {
    expect(getCompletedClockLabels(makeClock())).toEqual([
      'Pierwszy niestabilny błysk nad portem',
      'Pęknięcie soczewki i fala paniki',
    ]);
  });

  it('builds description without leaking future clock steps', () => {
    const description = buildDerivedThreatDescription(makeThreat().name, makeClock());

    expect(description).toContain('Zagrożenie wynikające z: Latarnia pęka pod naporem światła.');
    expect(description).toContain('Pierwszy niestabilny błysk nad portem');
    expect(description).toContain('Pęknięcie soczewki i fala paniki');
    expect(description).not.toContain('Sygnały wzywające coś spod wody');
  });

  it('builds active defaults linked to the source threat', () => {
    const defaults = buildDerivedThreatDefaults(makeThreat(), makeClock());

    expect(defaults.status).toBe('active');
    expect(defaults.forkThreatId).toBe('threat-1');
    expect(defaults.reasonOfDead).toBe('');
    expect(defaults.inheritanceNotes).toContain('Ukończone kroki zegara');
    expect(defaults.clock).toBeNull();
    expect(defaults.description).toBe('');
  });
});
