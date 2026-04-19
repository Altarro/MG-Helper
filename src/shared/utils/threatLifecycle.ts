import type { ThreatData, ThreatStatus } from '@modules/fronts/types';

export const SESSION_COMPLETED_DEFAULT_REASON = 'Zakończone w sesji';

function trimReason(reasonOfDead?: string): string {
  return typeof reasonOfDead === 'string' ? reasonOfDead.trim() : '';
}

export function deriveThreatStatus(
  status?: ThreatStatus,
  reasonOfDead?: string,
): ThreatStatus {
  if (status === 'completed') return 'completed';
  if (trimReason(reasonOfDead).length > 0) return 'completed';
  return 'active';
}

export function normalizeThreatLifecycle(
  status: ThreatStatus,
  reasonOfDead?: string,
): Pick<ThreatData, 'status' | 'reasonOfDead'> {
  const trimmed = trimReason(reasonOfDead);

  if (status === 'completed') {
    return {
      status: 'completed',
      reasonOfDead: trimmed,
    };
  }

  return {
    status: 'active',
    reasonOfDead: '',
  };
}

export function threatNeedsCleanupReason(
  data: Pick<ThreatData, 'status' | 'reasonOfDead'>,
): boolean {
  return deriveThreatStatus(data.status, data.reasonOfDead) === 'completed'
    && trimReason(data.reasonOfDead).length === 0;
}
