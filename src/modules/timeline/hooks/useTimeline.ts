import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isSession } from '@modules/sessions/types';
import { isThread } from '@modules/threads/types';
import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';

export interface TimelineData {
  sessions: Session[];
  threads: Thread[];
  /** Maps threadId → Set of sessionIds where the thread appears */
  threadSessionIds: Map<string, Set<string>>;
}

/**
 * Returns all sessions (sorted by number), all threads (sorted by name),
 * and a cross-reference map: threadId → Set<sessionId> built from `appears_in` relations.
 */
export function useTimeline(): TimelineData | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    // Load all sessions and threads in parallel
    const [allEntities, appearsInRels] = await Promise.all([
      db.entities.toArray(),
      db.relations.where('type').equals('appears_in').toArray(),
    ]);

    const sessions = allEntities
      .filter(isSession)
      .sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));

    const threads = allEntities
      .filter(isThread)
      .sort((a, b) => a.name.localeCompare(b.name));

    const threadIds = new Set(threads.map((t) => t.id));

    // Build map: threadId → Set<sessionId>
    const threadSessionIds = new Map<string, Set<string>>();
    for (const thread of threads) {
      threadSessionIds.set(thread.id, new Set());
    }
    for (const rel of appearsInRels) {
      if (threadIds.has(rel.sourceId)) {
        threadSessionIds.get(rel.sourceId)?.add(rel.targetId);
      }
    }

    return { sessions, threads, threadSessionIds };
  }, [db]);
}
