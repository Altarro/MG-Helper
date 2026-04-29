import { beforeEach, describe, expect, it } from 'vitest';
import {
  getGeneratorTelemetryEvents,
  getGeneratorFeedbackEntries,
  getGeneratorTelemetryInsights,
  submitGeneratorFeedback,
  trackGeneratorEvent,
} from '@modules/generator/telemetry';

describe('generator telemetry insights', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('aggregates rolls, conversions, pack popularity and import abandonment', () => {
    trackGeneratorEvent({
      name: 'generator_roll_commit',
      kind: 'character',
      packId: 'pack-a',
      hasSeed: false,
      withoutRepetition: false,
      durationMs: 10,
    });
    trackGeneratorEvent({
      name: 'generator_roll_commit',
      kind: 'customTable',
      packId: 'pack-a',
      customTableId: 'table-rumors',
      hasSeed: true,
      withoutRepetition: true,
      durationMs: 12,
    });
    trackGeneratorEvent({
      name: 'generator_roll_commit',
      kind: 'location',
      packId: 'pack-b',
      hasSeed: false,
      withoutRepetition: false,
      durationMs: 8,
    });
    trackGeneratorEvent({
      name: 'generator_result_conversion',
      fromKind: 'character',
      to: 'entity',
      entityType: 'npc',
    });
    trackGeneratorEvent({
      name: 'generator_import_flow',
      stage: 'abandoned',
      kind: 'json',
      mergeMode: 'append',
    });
    trackGeneratorEvent({
      name: 'generator_import_flow',
      stage: 'applied',
      kind: 'csv',
      mergeMode: 'overwrite',
    });
    trackGeneratorEvent({
      name: 'generator_feedback_submitted',
      sessionId: 's-1',
      category: 'ux',
      rating: 5,
    });

    const insights = getGeneratorTelemetryInsights();
    expect(insights.totalRolls).toBe(3);
    expect(insights.rollsPerKind.character).toBe(1);
    expect(insights.rollsPerKind.customTable).toBe(1);
    expect(insights.customTableRollCount).toBe(1);
    expect(insights.conversionCount).toBe(1);
    expect(insights.abandonedImports).toBe(1);
    expect(insights.importApplied).toBe(1);
    expect(insights.feedbackCount).toBe(1);
    expect(insights.avgFeedbackRating).toBe(5);
    expect(insights.topPacks[0]).toEqual({ packId: 'pack-a', rolls: 2 });
  });

  it('returns empty insights when storage payload is corrupted', () => {
    localStorage.setItem('mg-generator-telemetry', 'not-json');
    expect(getGeneratorTelemetryEvents()).toEqual([]);
    const insights = getGeneratorTelemetryInsights();
    expect(insights.totalRolls).toBe(0);
    expect(insights.topPacks).toEqual([]);
  });

  it('stores feedback entries in local storage', () => {
    submitGeneratorFeedback({
      id: 'fb-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      sessionId: 'session-1',
      rating: 4,
      category: 'quality',
      message: 'Dobre wyniki ale chcemy wiecej presetow.',
    });
    const feedback = getGeneratorFeedbackEntries();
    expect(feedback).toHaveLength(1);
    expect(feedback[0]?.id).toBe('fb-1');
  });
});

