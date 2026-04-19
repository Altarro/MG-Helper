import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isLocation } from '../types';
import type { Location } from '../types';

export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
}

/**
 * Loads all sub-locations (recursive) contained within `locationId`.
 * Returns a flat list of all contained locations + a tree structure.
 */
export function useLocationTree(locationId: string | undefined): {
  children: Location[];
  tree: LocationTreeNode[];
} {
  const { db } = useCampaign();
  const result = useLiveQuery(async () => {
    if (!locationId) return { children: [], tree: [] };

    // BFS to build the full tree
    const allLocations = new Map<string, Location>();
    const parentOf = new Map<string, string>(); // childId → parentId

    const queue: string[] = [locationId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      // Find contains relations where this entity is the source
      const containsRels = await db.relations
        .where('sourceId')
        .equals(current)
        .filter((r) => r.type === 'contains')
        .toArray();

      for (const rel of containsRels) {
        const child = await db.entities.get(rel.targetId);
        if (child && isLocation(child) && !visited.has(child.id)) {
          allLocations.set(child.id, child);
          parentOf.set(child.id, current);
          queue.push(child.id);
        }
      }
    }

    // Build tree nodes (only direct children of locationId at root)
    function buildTree(parentId: string): LocationTreeNode[] {
      const directChildren = [...allLocations.values()].filter(
        (loc) => parentOf.get(loc.id) === parentId,
      );
      return directChildren
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((loc) => ({ location: loc, children: buildTree(loc.id) }));
    }

    return {
      children: [...allLocations.values()].sort((a, b) => a.name.localeCompare(b.name)),
      tree: buildTree(locationId),
    };
  }, [db, locationId]);

  return result ?? { children: [], tree: [] };
}
