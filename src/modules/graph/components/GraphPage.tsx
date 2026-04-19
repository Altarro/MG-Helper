import { useState } from 'react';
import { ENTITY_TYPES } from '@shared/types/entity';
import { RELATION_TYPES } from '@shared/types/relation';
import { GraphView } from './GraphView';
import { GraphControls } from './GraphControls';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';

export function GraphPage() {
  const [visibleTypes, setVisibleTypes] = useState<Set<EntityType>>(new Set(ENTITY_TYPES));
  const [visibleRelations, setVisibleRelations] = useState<Set<RelationType>>(new Set(RELATION_TYPES));

  function toggleType(type: EntityType) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleRelation(rel: RelationType) {
    setVisibleRelations((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-surface-900">Graf relacji</h1>
      <GraphControls
        visibleTypes={visibleTypes}
        onToggleType={toggleType}
        visibleRelations={visibleRelations}
        onToggleRelation={toggleRelation}
      />
      <div className="flex flex-1 min-h-0 rounded-xl border border-surface-200 overflow-hidden">
        <GraphView visibleTypes={visibleTypes} visibleRelations={visibleRelations} />
      </div>
    </div>
  );
}
