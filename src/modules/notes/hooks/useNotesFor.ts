import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isNote } from '../types';
import type { Note } from '../types';

/** Notes linked to a specific entity via related_to relation */
export function useNotesFor(entityId: string): Note[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const [asSource, asTarget] = await Promise.all([
      db.relations
        .where('sourceId')
        .equals(entityId)
        .filter((r) => r.type === 'related_to')
        .toArray(),
      db.relations
        .where('targetId')
        .equals(entityId)
        .filter((r) => r.type === 'related_to')
        .toArray(),
    ]);
    const noteIds = [
      ...asSource.map((r) => r.targetId),
      ...asTarget.map((r) => r.sourceId),
    ];
    const entities = await Promise.all(noteIds.map((id) => db.entities.get(id)));
    return entities
      .filter((e): e is Note => e !== undefined && isNote(e))
      .sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
  }, [db, entityId]);
}
