import type { Clock } from '@modules/clocks/types';
import type { Threat } from '../types';
import type { ThreatFormValues } from '../components/ThreatForm';

function normalizeFilledSegments(clock: Clock): number {
  return Math.max(0, Math.min(clock.data.filled, clock.data.segments));
}

export function getCompletedClockLabels(clock: Clock | null | undefined): string[] {
  if (!clock) return [];

  const filled = normalizeFilledSegments(clock);
  return (clock.data.tickLabels ?? [])
    .slice(0, filled)
    .map((label) => label.trim())
    .filter(Boolean);
}

export function buildDerivedThreatDescription(
  sourceThreatName: string,
  clock: Clock | null | undefined,
): string {
  const sections = [`Zagrożenie wynikające z: ${sourceThreatName}.`];
  if (!clock) return sections.join('\n\n');

  const filled = normalizeFilledSegments(clock);
  if (filled === 0) return sections.join('\n\n');

  const completedLabels = getCompletedClockLabels(clock);
  if (completedLabels.length > 0) {
    sections.push([
      'Ukończone kroki zegara w zagrożeniu źródłowym:',
      ...completedLabels.map((label, index) => `${index + 1}. ${label}`),
    ].join('\n'));
    return sections.join('\n\n');
  }

  sections.push(`W zagrożeniu źródłowym ukończono ${filled} z ${clock.data.segments} segmentów zegara.`);
  return sections.join('\n\n');
}

export function buildDerivedThreatDefaults(
  sourceThreat: Threat,
  clock: Clock | null | undefined,
): ThreatFormValues {
  return {
    name: `${sourceThreat.name} - następstwo`,
    threatType: sourceThreat.data.threatType,
    status: 'active',
    impulse: sourceThreat.data.impulse,
    trigger: '',
    reasonOfDead: '',
    inheritanceNotes: buildDerivedThreatDescription(sourceThreat.name, clock),
    forkThreatId: sourceThreat.id,
    moves: [...sourceThreat.data.moves],
    description: '',
    tags: [...sourceThreat.tags],
    clock: null,
  };
}
