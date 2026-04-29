import type { AttentionTier, BackstageSnapshot, ClockTickHint, ThreatRadarResult } from '../types';
import type { RadarArchetype, Threat } from '@modules/fronts/types';
import { getThreatRadarArchetype } from '@modules/fronts/types';
import { THREAT_RADAR_DEFAULT_WEIGHTS, type ThreatRadarArchetypeWeights } from './threatRadarArchetypes';

const EPS = 1e-6;

/** Triangular membership on [0,1], peak at `center`, half-width `width`. */
function triMu(x: number, center: number, width: number): number {
  if (width <= 0) return 0;
  const d = Math.abs(x - center) / width;
  return Math.max(0, 1 - d);
}

/** Fuzzy-ish crisping: three labels on [0,1] → single crisp in [0,1]. */
function fuzzScalar01(x: number): { low: number; mid: number; high: number; crisp: number } {
  const low = triMu(x, 0.15, 0.38);
  const mid = triMu(x, 0.5, 0.38);
  const high = triMu(x, 0.85, 0.38);
  const denom = low + mid + high + EPS;
  const crisp = (low * 0.15 + mid * 0.5 + high * 0.85) / denom;
  return { low, mid, high, crisp };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function heatToBaseTier(heat: number): AttentionTier {
  if (heat < 0.18) return 0;
  if (heat < 0.35) return 1;
  if (heat < 0.52) return 2;
  if (heat < 0.72) return 3;
  return 4;
}

function computeClockTickHint(
  clockRows: { filled: number; segments: number; isActive: boolean; isCompleted: boolean }[],
  clockCritical: boolean,
): ClockTickHint {
  if (clockCritical) return 'critical';
  for (const c of clockRows) {
    if (!c.isActive || c.isCompleted || c.segments <= 0) continue;
    const r = c.filled / c.segments;
    if (r >= 0.52 && r < 0.85) return 'soon';
  }
  return 'none';
}

function buildCue(params: {
  tier: AttentionTier;
  clockCritical: boolean;
  narrativeGap: boolean;
  sinceClockSessions: number;
  debt: number;
  presence: number;
  hasClockTickAnchor: boolean;
  sessionsSinceFootprintLabel: string;
}): string {
  const { clockCritical, narrativeGap, sinceClockSessions, debt, presence, hasClockTickAnchor, sessionsSinceFootprintLabel } =
    params;
  if (clockCritical) {
    return 'Zegar jest blisko pełna — zdecyduj, co robi zagrożenie, zanim segment się domknie.';
  }
  if (narrativeGap) {
    return 'W ostatniej sesji był powiązany wątek, a wskazówki wciąż wiszą — dobry moment na delikatne pchnięcie fabuły.';
  }
  if (hasClockTickAnchor && sinceClockSessions >= 0.72 && presence < 0.42) {
    return `Dawno nie było śladu na stole od ostatniego ticku zegara (${sessionsSinceFootprintLabel}) — wróć do sceny albo świadomie zdejmij napięcie.`;
  }
  if (!hasClockTickAnchor && presence < 0.35) {
    return `Mało śladu na ostatnich sesjach (${sessionsSinceFootprintLabel}) — rozważ powrót albo świadome odłożenie.`;
  }
  if (debt >= 0.68) {
    return 'Napięcie narracyjne rośnie — sprawdź wątki i wskazówki powiązane z tym zagrożeniem.';
  }
  if (params.tier >= 3) {
    return 'Warto przygotować ruch tego zagrożenia przed kolejną sesją.';
  }
  if (params.tier >= 2) {
    return 'Rzuć okiem na kartę — może coś czeka na dopięcie.';
  }
  return 'Na razie bez pilnych sygnałów z radaru.';
}

type ClockRow = {
  filled: number;
  segments: number;
  isActive: boolean;
  isCompleted: boolean;
  lastAdvanceSessionId?: string;
  lastAdvanceAt?: string;
};

function archetypeHeat(params: {
  archetype: RadarArchetype;
  weights: Partial<Record<RadarArchetype, ThreatRadarArchetypeWeights>>;
  footprintAbsence: number;
  sinceClock: number;
  threadOpen: number;
  clueDebt: number;
  clockFill: number;
}): number {
  const w = params.weights[params.archetype] ?? params.weights.mystery ?? THREAT_RADAR_DEFAULT_WEIGHTS.mystery;
  return clamp01(
    w.footprintAbsence * params.footprintAbsence +
      w.sinceClock * params.sinceClock +
      w.threadOpen * params.threadOpen +
      w.clueDebt * params.clueDebt +
      w.clockFill * params.clockFill,
  );
}

export function computeThreatRadarRow(
  snap: BackstageSnapshot,
  threat: Threat,
  weights: Partial<Record<RadarArchetype, ThreatRadarArchetypeWeights>> = THREAT_RADAR_DEFAULT_WEIGHTS,
): ThreatRadarResult {
  const threatId = threat.id;
  const threatName = threat.name;
  const radarArchetype = getThreatRadarArchetype(threat.data);

  const sessionsOrdered = [...snap.sessions].sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));
  const sessionIds = sessionsOrdered.map((s) => s.id);
  const lastIdx = sessionIds.length - 1;
  const lastSessionId = lastIdx >= 0 ? sessionIds[lastIdx] : undefined;

  const footprint = snap.threatFootprintSessionIds.get(threatId) ?? new Set<string>();
  const windowN = Math.min(6, Math.max(1, sessionIds.length));
  let footprintHits = 0;
  for (let i = Math.max(0, lastIdx - windowN + 1); i <= lastIdx; i++) {
    if (footprint.has(sessionIds[i]!)) footprintHits++;
  }
  const footprintPresence = sessionIds.length <= 0 ? 0 : footprintHits / windowN;

  let lastFootprintIdx = -1;
  for (let i = 0; i <= lastIdx; i++) {
    if (footprint.has(sessionIds[i]!)) lastFootprintIdx = i;
  }
  const sessionsSinceFootprint =
    lastFootprintIdx < 0 ? sessionIds.length : Math.max(0, lastIdx - lastFootprintIdx);

  const clockRows = snap.threatClocks.get(threatId) ?? [];
  let tickSessionIdx = -1;
  for (const c of clockRows as ClockRow[]) {
    const sid = c.lastAdvanceSessionId;
    if (!sid) continue;
    const idx = sessionIds.indexOf(sid);
    if (idx >= 0) tickSessionIdx = Math.max(tickSessionIdx, idx);
  }
  const hasClockTickAnchor = tickSessionIdx >= 0;
  const sessionsSinceTick =
    !hasClockTickAnchor || lastIdx < 0
      ? sessionsSinceFootprint
      : Math.max(0, lastIdx - tickSessionIdx);
  const sinceClockSessions =
    sessionIds.length <= 0 ? 0 : Math.min(1, sessionsSinceTick / Math.max(1, sessionIds.length));

  const clueRows = snap.threatClues.get(threatId) ?? [];
  const clueTotal = clueRows.length;
  const discovered = clueRows.filter((c) => c.discovered).length;
  const cluesUndiscoveredRatio = clueTotal === 0 ? 0.28 : clamp01((clueTotal - discovered) / clueTotal);

  const linkedThreadIds = snap.threatThreadIds.get(threatId) ?? [];
  let completedT = 0;
  let totalT = 0;
  for (const tid of linkedThreadIds) {
    const th = snap.threads.find((t) => t.id === tid);
    if (!th) continue;
    totalT++;
    if (th.data.status === 'completed') completedT++;
  }
  const threadsResolvedRatio = totalT === 0 ? 0.5 : clamp01(completedT / totalT);
  const threadOpenRatio = totalT === 0 ? 0.22 : clamp01(1 - threadsResolvedRatio);

  let clockFill = 0;
  for (const c of clockRows) {
    if (!c.isActive || c.isCompleted || c.segments <= 0) continue;
    clockFill = Math.max(clockFill, clamp01(c.filled / c.segments));
  }

  const fpFuzz = fuzzScalar01(footprintPresence).crisp;
  const scFuzz = fuzzScalar01(sinceClockSessions).crisp;
  const clueFuzz = fuzzScalar01(cluesUndiscoveredRatio).crisp;
  const thrOpenFuzz = fuzzScalar01(threadOpenRatio).crisp;
  const clkFuzz = fuzzScalar01(clockFill).crisp;

  const footprintAbsence = clamp01(1 - fpFuzz);

  let narrativeGap = false;
  if (lastSessionId && clueTotal > 0 && discovered < clueTotal) {
    for (const tid of linkedThreadIds) {
      const set = snap.threadSessionIds.get(tid);
      if (set?.has(lastSessionId)) {
        narrativeGap = true;
        break;
      }
    }
  }

  const debt = clamp01(0.5 * thrOpenFuzz + 0.5 * clueFuzz + (narrativeGap ? 0.12 : 0));

  const clockCritical = clockRows.some((c) => {
    if (!c.isActive || c.isCompleted || c.segments <= 0) return false;
    return c.filled / c.segments >= 0.85;
  });

  let heat = archetypeHeat({
    archetype: radarArchetype,
    weights,
    footprintAbsence,
    sinceClock: scFuzz,
    threadOpen: thrOpenFuzz,
    clueDebt: clueFuzz,
    clockFill: clkFuzz,
  });
  heat = clamp01(heat + (clockCritical ? 0.1 : 0) + (narrativeGap ? 0.06 : 0));

  const base = heatToBaseTier(heat);
  let floorT: AttentionTier = 0;
  if (clockCritical) floorT = 3;
  else if (narrativeGap && cluesUndiscoveredRatio > 0.38) floorT = 2;

  const merged = Math.min(4, Math.max(base, floorT)) as AttentionTier;

  const sessionsSinceFootprintLabel =
    lastFootprintIdx < 0
      ? 'brak śladu na sesjach'
      : `${sessionsSinceFootprint} ${sessionsSinceFootprint === 1 ? 'sesja' : 'sesji'} od ostatniego śladu`;

  const cue = buildCue({
    tier: merged,
    clockCritical,
    narrativeGap,
    sinceClockSessions,
    debt,
    presence: footprintPresence,
    hasClockTickAnchor,
    sessionsSinceFootprintLabel,
  });

  const clockTickHint = computeClockTickHint(clockRows, clockCritical);
  const clockTickCue =
    clockTickHint === 'soon'
      ? 'Zegar rośnie — jeśli pasuje do stołu, możesz dosunąć segment sam w module zegarów (apka tylko sugeruje, nie zapisuje).'
      : undefined;

  const spotlightScore = clamp01(heat + (narrativeGap ? 0.06 : 0) + (clockCritical ? 0.05 : 0));

  return {
    threatId,
    name: threatName,
    radarArchetype,
    presence: footprintPresence,
    debt,
    heat,
    tier: merged,
    cue,
    clockCritical,
    narrativeGap,
    scalars: {
      footprintPresence,
      sinceClockSessions,
      threadsResolvedRatio,
      cluesUndiscoveredRatio,
      clockFill,
    },
    spotlightScore,
    spotlightRank: 0,
    isSpotlightSuggestion: false,
    clockTickHint,
    clockTickCue,
  };
}

const MIN_SPOTLIGHT = 0.12;

export function computeAllThreatRadarRows(
  snap: BackstageSnapshot,
  weights: Partial<Record<RadarArchetype, ThreatRadarArchetypeWeights>> = THREAT_RADAR_DEFAULT_WEIGHTS,
): ThreatRadarResult[] {
  const baseRows = snap.activeThreats.map((t) => computeThreatRadarRow(snap, t, weights));
  const ranked = [...baseRows].sort((a, b) => {
    if (b.spotlightScore !== a.spotlightScore) return b.spotlightScore - a.spotlightScore;
    if (b.heat !== a.heat) return b.heat - a.heat;
    return a.name.localeCompare(b.name, 'pl');
  });
  const topScore = ranked[0]?.spotlightScore ?? 0;
  const rankById = new Map<string, number>();
  ranked.forEach((r, i) => rankById.set(r.threatId, i + 1));

  const rows = baseRows.map((row) => {
    const spotlightRank = rankById.get(row.threatId) ?? 1;
    const isSpotlightSuggestion =
      spotlightRank === 1 && row.spotlightScore >= MIN_SPOTLIGHT && topScore >= MIN_SPOTLIGHT;
    const spotlightCue = isSpotlightSuggestion
      ? 'Sugestia „na stole teraz”: daj temu zagrożeniu wyraźny beat w nadchodzącej sesji (ruch, scena, ewentualnie segment zegara) — tylko Ty zapisujesz zmiany w kampanii.'
      : undefined;
    return { ...row, spotlightRank, isSpotlightSuggestion, spotlightCue };
  });

  rows.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    if (b.heat !== a.heat) return b.heat - a.heat;
    return a.name.localeCompare(b.name, 'pl');
  });
  return rows;
}
