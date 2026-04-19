import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
  tags: string[];
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function useGraphData(
  visibleTypes?: Set<EntityType>,
  visibleRelations?: Set<RelationType>,
): GraphData | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const [entities, relations] = await Promise.all([
      db.entities.toArray(),
      db.relations.toArray(),
    ]);

    const filteredEntities = visibleTypes
      ? entities.filter((e) => visibleTypes.has(e.type))
      : entities;

    const entityIdSet = new Set(filteredEntities.map((e) => e.id));

    const nodes: GraphNode[] = filteredEntities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      tags: e.tags,
    }));

    const filteredLinks = relations.filter((r) => {
      const typeOk = visibleRelations ? visibleRelations.has(r.type) : true;
      return typeOk && entityIdSet.has(r.sourceId) && entityIdSet.has(r.targetId);
    });

    const links: GraphLink[] = filteredLinks.map((r) => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      type: r.type,
      label: r.label,
    }));

    return { nodes, links };
  }, [db, visibleTypes, visibleRelations]);
}
