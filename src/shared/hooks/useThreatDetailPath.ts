import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';

export function useThreatDetailPath(threatId: string | undefined): string | null | undefined {
  if (!threatId) return null;
  return getEntityDetailPath('threat', threatId);
}
