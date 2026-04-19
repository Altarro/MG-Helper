import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isSession } from '@modules/sessions/types';
import type { Session } from '@modules/sessions/types';

/**
 * Returns all Sessions linked to a thread via `appears_in` relation
 * (thread → session), sorted by session number.
 */
export function useThreadSessions(threadId: string | undefined): Session[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!threadId) return [];
    const rels = await db.relations
      .where('sourceId').equals(threadId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(
      rels.map((r) => db.entities.get(r.targetId)),
    );
    const sessions = entities.filter((e): e is Session => !!e && isSession(e));
    return sessions.sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));
  }, [db, threadId]);
}
