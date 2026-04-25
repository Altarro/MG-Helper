import type { AttentionTier, BackstageSnapshot, ThreatRadarResult } from '../types';

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

function buildCue(params: {
  tier: AttentionTier;
  clockCritical: boolean;
  narrativeGap: boolean;
  absence: number;
  debt: number;
  presence: number;
  sessionsSinceLabel: string;
}): string {
  const { clockCritical, narrativeGap, absence, debt, presence, sessionsSinceLabel } = params;
  if (clockCritical) {
    return 'Zegar jest blisko pełna — zdecyduj, co robi zagrożenie, zanim segment się domknie.';
  }
  if (narrativeGap) {
    return 'W ostatniej sesji był powiązany wątek, a wskazówki wciąż wiszą — dobry moment na delikatne pchnięcie fabuły.';
  }
  if (absence >= 0.72 && presence < 0.42) {
    return `Dawno nie było na stole (${sessionsSinceLabel}) — wróć do sceny albo świadomie zdejmij napięcie.`;
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

export function computeThreatRadarRow(
  snap: BackstageSnapshot,
  threatId: string,
  threatName: string,
): ThreatRadarResult {
  const sessionsOrdered = [...snap.sessions].sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));
  const sessionIds = sessionsOrdered.map((s) => s.id);
  const lastIdx = sessionIds.length - 1;
  const lastSessionId = lastIdx >= 0 ? sessionIds[lastIdx] : undefined;

  const appears = snap.threatSessionIds.get(threatId) ?? new Set<string>();

  let lastAppearanceIdx = -1;
  for (let i = 0; i <= lastIdx; i++) {
    if (appears.has(sessionIds[i]!)) lastAppearanceIdx = i;
  }

  const sessionsSinceLast =
    lastAppearanceIdx < 0 ? sessionIds.length : Math.max(0, lastIdx - lastAppearanceIdx);
  const absenceRaw =
    sessionIds.length <= 0 ? 0 : Math.min(1, sessionsSinceLast / Math.max(1, sessionIds.length));

  let streak = 0;
  for (let i = lastIdx; i >= 0; i--) {
    if (appears.has(sessionIds[i]!)) break;
    streak++;
  }
  const streakCap = Math.max(1, Math.min(6, sessionIds.length || 1));
  const streakAbsence = Math.min(1, streak / streakCap);

  const clueRows = snap.threatClues.get(threatId) ?? [];
  const clueTotal = clueRows.length;
  const discovered = clueRows.filter((c) => c.discovered).length;
  const clueDebt = clueTotal === 0 ? 0.28 : clamp01((clueTotal - discovered) / clueTotal);

  const linkedThreadIds = snap.threatThreadIds.get(threatId) ?? [];
  let active = 0;
  let totalT = 0;
  for (const tid of linkedThreadIds) {
    const th = snap.threads.find((t) => t.id === tid);
    if (!th) continue;
    totalT++;
    if (th.data.status !== 'completed') active++;
  }
  const threadActive = totalT === 0 ? 0.22 : clamp01(active / totalT);

  const clockRows = snap.threatClocks.get(threatId) ?? [];
  let clockFill = 0;
  for (const c of clockRows) {
    if (!c.isActive || c.isCompleted || c.segments <= 0) continue;
    clockFill = Math.max(clockFill, clamp01(c.filled / c.segments));
  }

  const x1 = fuzzScalar01(absenceRaw).crisp;
  const x2 = fuzzScalar01(clueDebt).crisp;
  const x3 = fuzzScalar01(threadActive).crisp;
  const x4 = fuzzScalar01(clockFill).crisp;
  const x5 = fuzzScalar01(streakAbsence).crisp;

  const presence = clamp01(0.55 * (1 - x1) + 0.25 * (1 - x5) + 0.2 * x4);

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

  const debt = clamp01(0.48 * x2 + 0.35 * x3 + (narrativeGap ? 0.22 : 0));

  const clockCritical = clockRows.some((c) => {
    if (!c.isActive || c.isCompleted || c.segments <= 0) return false;
    return c.filled / c.segments >= 0.85;
  });

  const heat = clamp01(0.52 * debt + 0.48 * (1 - presence) + (clockCritical ? 0.1 : 0));

  const base = heatToBaseTier(heat);
  let floorT: AttentionTier = 0;
  if (clockCritical) floorT = 3;
  else if (narrativeGap && clueDebt > 0.38) floorT = 2;

  const merged = Math.min(4, Math.max(base, floorT)) as AttentionTier;

  const sessionsSinceLabel =
    lastAppearanceIdx < 0
      ? 'nigdy nie powiązane z sesją'
      : `${sessionsSinceLast} ${sessionsSinceLast === 1 ? 'sesja' : 'sesji'} od ostatniej sceny`;

  const cue = buildCue({
    tier: merged,
    clockCritical,
    narrativeGap,
    absence: absenceRaw,
    debt,
    presence,
    sessionsSinceLabel,
  });

  return {
    threatId,
    name: threatName,
    presence,
    debt,
    heat,
    tier: merged,
    cue,
    clockCritical,
    narrativeGap,
    scalars: {
      absence: absenceRaw,
      clueDebt,
      threadActive,
      clockFill,
      streakAbsence,
    },
  };
}

export function computeAllThreatRadarRows(snap: BackstageSnapshot): ThreatRadarResult[] {
  const rows = snap.activeThreats.map((t) => computeThreatRadarRow(snap, t.id, t.name));
  rows.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    if (b.heat !== a.heat) return b.heat - a.heat;
    return a.name.localeCompare(b.name, 'pl');
  });
  return rows;
}
