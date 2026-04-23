export type GeneratorTelemetryEvent =
  | {
      name: 'generator_roll_commit';
      kind: string;
      packId: string;
      customTableId?: string;
      hasSeed: boolean;
      withoutRepetition: boolean;
      durationMs: number;
    }
  | {
      name: 'generator_roll_preview';
      kind: string;
      hasSeed: boolean;
      withoutRepetition: boolean;
      durationMs: number;
    }
  | {
      name: 'generator_integrity_check';
      campaignId: string;
      repaired: boolean;
      droppedPacks: number;
      droppedLogs: number;
      error?: string;
    }
  | {
      name: 'generator_result_conversion';
      fromKind: string;
      to: 'note' | 'entity';
      entityType?: 'npc' | 'location' | 'note';
    }
  | {
      name: 'generator_import_flow';
      stage: 'started' | 'preview_ok' | 'applied' | 'failed' | 'abandoned';
      kind: 'json' | 'csv';
      mergeMode: string;
      error?: string;
    }
  | {
      name: 'generator_feedback_submitted';
      sessionId: string;
      rating: 1 | 2 | 3 | 4 | 5;
      category: 'ux' | 'quality' | 'speed' | 'other';
    };

export interface GeneratorTelemetryInsights {
  totalRolls: number;
  rollsPerKind: Record<string, number>;
  conversionCount: number;
  conversionRate: number;
  customTableRollCount: number;
  topPacks: Array<{ packId: string; rolls: number }>;
  abandonedImports: number;
  importApplied: number;
  feedbackCount: number;
  avgFeedbackRating: number;
}

export interface GeneratorFeedbackEntry {
  id: string;
  createdAt: string;
  sessionId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  category: 'ux' | 'quality' | 'speed' | 'other';
  message: string;
}

const TELEMETRY_KEY = 'mg-generator-telemetry';
const FEEDBACK_KEY = 'mg-generator-feedback';

export function trackGeneratorEvent(event: GeneratorTelemetryEvent): void {
  // Local, non-invasive telemetry sink. Can be replaced with remote provider later.
  try {
    const previous = JSON.parse(localStorage.getItem(TELEMETRY_KEY) ?? '[]') as GeneratorTelemetryEvent[];
    const next = [event, ...previous].slice(0, 200);
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
  } catch {
    // ignore telemetry failures
  }
}

export function getGeneratorTelemetryEvents(): GeneratorTelemetryEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TELEMETRY_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as GeneratorTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

export function getGeneratorTelemetryInsights(): GeneratorTelemetryInsights {
  const events = getGeneratorTelemetryEvents();
  const rollsPerKind: Record<string, number> = {};
  const packCounts = new Map<string, number>();
  let totalRolls = 0;
  let conversionCount = 0;
  let customTableRollCount = 0;
  let abandonedImports = 0;
  let importApplied = 0;
  let feedbackCount = 0;
  let feedbackRatingSum = 0;

  for (const event of events) {
    if (event.name === 'generator_roll_commit') {
      totalRolls += 1;
      rollsPerKind[event.kind] = (rollsPerKind[event.kind] ?? 0) + 1;
      packCounts.set(event.packId, (packCounts.get(event.packId) ?? 0) + 1);
      if (event.kind === 'customTable') {
        customTableRollCount += 1;
      }
      continue;
    }
    if (event.name === 'generator_result_conversion') {
      conversionCount += 1;
      continue;
    }
    if (event.name === 'generator_import_flow') {
      if (event.stage === 'abandoned') abandonedImports += 1;
      if (event.stage === 'applied') importApplied += 1;
      continue;
    }
    if (event.name === 'generator_feedback_submitted') {
      feedbackCount += 1;
      feedbackRatingSum += event.rating;
    }
  }

  const topPacks = [...packCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([packId, rolls]) => ({ packId, rolls }));

  return {
    totalRolls,
    rollsPerKind,
    conversionCount,
    conversionRate: totalRolls > 0 ? conversionCount / totalRolls : 0,
    customTableRollCount,
    topPacks,
    abandonedImports,
    importApplied,
    feedbackCount,
    avgFeedbackRating: feedbackCount > 0 ? feedbackRatingSum / feedbackCount : 0,
  };
}

export function getGeneratorFeedbackEntries(): GeneratorFeedbackEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as GeneratorFeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

export function submitGeneratorFeedback(entry: GeneratorFeedbackEntry): void {
  try {
    const previous = getGeneratorFeedbackEntries();
    const next = [entry, ...previous].slice(0, 200);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
  } catch {
    // ignore feedback storage failures
  }
}

