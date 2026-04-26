import type { ThreatData, ThreatStatus } from '@modules/fronts/types';

export const SESSION_COMPLETED_DEFAULT_REASON = 'Zakończone w sesji';

function trimReason(reason?: string): string {
  return typeof reason === 'string' ? reason.trim() : '';
}

export function getThreatCompletionReason(
  data: Pick<ThreatData, 'completionReason' | 'reasonOfDead'>,
): string {
  return trimReason(data.completionReason) || trimReason(data.reasonOfDead);
}

export function deriveThreatStatus(
  status?: ThreatStatus,
  completionReason?: string,
  reasonOfDead?: string,
): ThreatStatus {
  if (status === 'completed') return 'completed';
  if (trimReason(completionReason).length > 0) return 'completed';
  if (trimReason(reasonOfDead).length > 0) return 'completed';
  return 'active';
}

export function normalizeThreatLifecycle(
  status: ThreatStatus,
  completionReason?: string,
): Pick<ThreatData, 'status' | 'completionReason'> {
  const trimmed = trimReason(completionReason);

  if (status === 'completed') {
    return {
      status: 'completed',
      completionReason: trimmed,
    };
  }

  return {
    status: 'active',
    completionReason: '',
  };
}

export function threatNeedsCleanupReason(
  data: Pick<ThreatData, 'status' | 'completionReason' | 'reasonOfDead'>,
): boolean {
  return deriveThreatStatus(data.status, data.completionReason, data.reasonOfDead) === 'completed'
    && getThreatCompletionReason(data).length === 0;
}
