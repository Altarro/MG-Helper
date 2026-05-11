import { useState } from 'react';
import { Link } from 'react-router';
import { UserPlus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { MgHelperDb } from '@shared/db/database';
import { addRelation } from '@shared/db/operations';
import { DraggableNpcChip } from '@shared/components/DraggableNpcChip';
import { toast } from 'sonner';
import type { Entity } from '@shared/types';

interface NpcContextPanelProps {
  sessionId: string;
  locationId: string | null;
  onSelectionChange?: (selectedIds: string[]) => void;
}

function useNpcContext(db: MgHelperDb, sessionId: string, locationId: string | null) {
  return useLiveQuery(async () => {
    // NPCs in session via appears_in
    const sessionRels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const sessionNpcIds = new Set(
      sessionRels.filter(async () => true).map((r) => r.sourceId),
    );
    const sessionNpcEntities = await db.entities
      .where('id')
      .anyOf([...sessionNpcIds])
      .filter((e) => e.type === 'npc')
      .toArray();
    const inSessionIds = new Set(sessionNpcEntities.map((n) => n.id));

    // NPCs in location via contains
    let inLocation: Entity[] = [];
    if (locationId) {
      const locRels = await db.relations
        .where('sourceId')
        .equals(locationId)
        .filter((r) => r.type === 'contains')
        .toArray();
      const locNpcIds = locRels.map((r) => r.targetId);
      if (locNpcIds.length > 0) {
        inLocation = await db.entities
          .where('id')
          .anyOf(locNpcIds)
          .filter((e) => e.type === 'npc')
          .toArray();
      }
    }

    return { inSession: sessionNpcEntities, inSessionIds, inLocation };
  }, [db, sessionId, locationId]) ?? { inSession: [], inSessionIds: new Set<string>(), inLocation: [] };
}

export function NpcContextPanel({ sessionId, locationId, onSelectionChange }: NpcContextPanelProps) {
  const { db } = useCampaign();
  const { inSession, inSessionIds, inLocation } = useNpcContext(db, sessionId, locationId);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  }

  async function addToSession(npc: Entity) {
    try {
      await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: sessionId });
      toast.success(`${npc.name} dodany do sesji`);
    } catch {
      toast.error('Nie udało się dodać do sesji');
    }
  }

  const inLocationOnly = inLocation.filter((n) => !inSessionIds.has(n.id));

  return (
    <div className="flex flex-col gap-3">
      {/* W lokacji */}
      {locationId && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-400">
            W lokacji
          </p>
          {inLocationOnly.length === 0 ? (
            <p className="text-xs text-surface-400">Brak postaci w tej lokacji</p>
          ) : (
            <ul className="space-y-0.5">
              {inLocationOnly.map((npc) => (
                <li key={npc.id} className="flex items-center gap-1.5">
                  <DraggableNpcChip npcId={npc.id} npcName={npc.name} fromLocationId={locationId}>
                    <Link
                      to={`/npcs/${npc.id}`}
                      className="flex-1 truncate text-xs text-primary-600 hover:underline"
                    >
                      {npc.name}
                    </Link>
                  </DraggableNpcChip>
                  <button
                    onClick={() => addToSession(npc)}
                    title="Dodaj do sesji"
                    className="flex h-5 w-5 items-center justify-center rounded text-surface-400 hover:bg-primary-50 hover:text-primary-600"
                  >
                    <UserPlus className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* W sesji */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-400">
          W sesji
        </p>
        {inSession.length === 0 ? (
          <p className="text-xs text-surface-400">Brak postaci w sesji</p>
        ) : (
          <ul className="space-y-0.5">
            {inSession.map((npc) => (
              <li key={npc.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selected.has(npc.id)}
                  onChange={() => toggleSelect(npc.id)}
                  className="h-3 w-3 rounded accent-primary-600"
                  title="Oznacz do notatki"
                />
                <Link
                  to={`/npcs/${npc.id}`}
                  className="truncate text-xs text-primary-600 hover:underline"
                >
                  {npc.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
