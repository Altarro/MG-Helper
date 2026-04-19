import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isFront } from '@modules/fronts/types';
import { isClock } from '@modules/clocks/types';
import { isNpcLocationHistoryEvent } from '@modules/npcs/types';
import type { Front } from '@modules/fronts/types';
import type { Clock } from '@modules/clocks/types';
import type { Entity } from '@shared/types/entity';

export interface DashboardData {
  activeFronts: Front[];
  runningClocks: Clock[];
  recentEntities: Entity[];
}

export function useDashboard(): DashboardData | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const [allEntities, allRelations] = await Promise.all([
      db.entities.toArray(),
      db.relations.toArray(),
    ]);

    // Active fronts
    const activeFronts = allEntities.filter(isFront);

    // Clocks with filled < segments (still running) and not dead
    const runningClocks = allEntities
      .filter(isClock)
      .filter((c) => c.data.filled < c.data.segments && c.data.isActive !== false);

    // Recently edited (top 10 by updatedAt, all types)
    const recentEntities = [...allEntities]
      .filter((entity) => !isNpcLocationHistoryEvent(entity))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10);

    void allRelations; // allRelations available for future use
    return { activeFronts, runningClocks, recentEntities };
  }, [db]);
}
