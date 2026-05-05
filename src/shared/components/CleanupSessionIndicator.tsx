import { ListChecks } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { getSessionLifecycleStatus, type SessionData } from '@modules/sessions/types';

export function CleanupSessionIndicator() {
  const navigate = useNavigate();
  const { db } = useCampaign();
  const cleanupMeta = useLiveQuery(async () => {
    const sessions = await db.entities.where('type').equals('session').toArray();
    const cleanupPending = sessions
      .filter((entity) => getSessionLifecycleStatus(entity.data as unknown as SessionData) === 'cleanup_pending')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      count: cleanupPending.length,
      latestId: cleanupPending[0]?.id ?? null,
      latestName: cleanupPending[0]?.name ?? null,
    };
  }, [db]);

  if (!cleanupMeta || cleanupMeta.count === 0 || !cleanupMeta.latestId) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/sessions/${cleanupMeta.latestId}/cleanup`)}
      className="flex items-center gap-1.5 rounded-full border border-[rgba(176,108,103,0.3)] bg-[rgba(176,108,103,0.14)] px-2.5 py-1 text-xs shadow-[0_6px_16px_rgba(176,108,103,0.14)] transition-colors hover:bg-[rgba(176,108,103,0.2)]"
      title={
        cleanupMeta.latestName
          ? `Dokończ cleanup: ${cleanupMeta.latestName}`
          : 'Dokończ cleanup'
      }
      aria-label="Dokończ cleanup"
    >
      <ListChecks className="h-3.5 w-3.5 shrink-0 text-danger-700" />
      <span className="font-medium text-danger-800">
        Dokończ sprzątanie sesji{cleanupMeta.count > 1 ? ` (${cleanupMeta.count})` : ''}
      </span>
    </button>
  );
}
