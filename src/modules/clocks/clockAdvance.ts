import type { ClockData } from './types';

/**
 * Przy zwiększeniu `filled` (tick w przód) ustawia kotwicę czasu / sesji dla radaru backstage.
 * Cofanie segmentu lub reset nie czyści pól — zostają do decyzji MG w innym miejscu.
 */
export function withClockAdvanceMeta(
  prev: ClockData,
  newFilled: number,
  opts?: { sessionId?: string },
): ClockData {
  const cap = Math.max(1, prev.segments);
  const clamped = Math.max(0, Math.min(newFilled, cap));
  if (clamped <= prev.filled) {
    return { ...prev, filled: clamped };
  }
  const next: ClockData = {
    ...prev,
    filled: clamped,
    lastAdvanceAt: new Date().toISOString(),
  };
  if (opts?.sessionId) {
    next.lastAdvanceSessionId = opts.sessionId;
  }
  return next;
}
