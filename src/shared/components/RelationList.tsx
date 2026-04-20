import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { X, Link as LinkIcon } from 'lucide-react';
import { useRelations } from '@shared/hooks/useRelations';
import { useEntityById } from '@shared/hooks/useEntityById';
import { useCampaign } from '@shared/db/CampaignContext';
import { deleteRelation } from '@shared/db/operations';
import { toast } from 'sonner';
import type { Relation, RelationType } from '@shared/types/relation';
import type { Entity } from '@shared/types/entity';
import {
  getClueStrengthLabel,
  getThreadDerivationDirectionLabel,
  getThreadDerivationKindLabel,
} from '@shared/domain/storyContracts';
import { EntityTypeBadge } from './EntityTypeBadge';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import { InlineEmptyState } from './InlineEmptyState';

const RELATION_LABELS: Record<RelationType, string> = {
  contains: 'Zawiera',
  belongs_to: 'Należy do',
  tracks: 'Śledzi',
  appears_in: 'Pojawia się w',
  owns: 'Posiada',
  related_to: 'Powiązany z',
  clues_for: 'Wskazówka do',
  derives_from: 'Wynika z',
  affects: 'Wplywa na',
};

interface RelationRowProps {
  relation: Relation;
  relationId: string;
  relationType: RelationType;
  otherId: string;
  label?: string;
  direction: 'source' | 'target';
  onNavigate?: (entity: Entity) => void;
  onDeleted: () => void;
}

function RelationRow({
  relation,
  relationId,
  relationType,
  otherId,
  label,
  direction,
  onNavigate,
  onDeleted,
}: RelationRowProps) {
  const { db } = useCampaign();
  const navigate = useNavigate();
  const location = useLocation();
  const other = useEntityById(otherId);
  const [deleting, setDeleting] = useState(false);

  if (!other) return null;

  const detailPath = getEntityDetailPath(other.type, other.id);
  const canOpen = Boolean(onNavigate || detailPath);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRelation(db, relationId);
      onDeleted();
    } catch {
      toast.error('Nie udało się usunąć relacji');
      setDeleting(false);
    }
  }

  function handleOpenTarget() {
    if (!other) {
      return;
    }

    if (onNavigate) {
      onNavigate(other);
      return;
    }

    if (detailPath) {
      const returnToSessionLive = typeof location.state === 'object'
        && location.state !== null
        && 'returnToSessionLive' in location.state
        && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
          ? (location.state as { returnToSessionLive: string }).returnToSessionLive
          : null;
      navigate(detailPath, {
        state: returnToSessionLive ? { returnToSessionLive } : undefined,
      });
    }
  }

  const directionLabel = direction === 'source' ? '→' : '←';
  const relationBadgeLabel =
    relationType === 'derives_from' && relation.meta?.threadDerivationKind
      ? getThreadDerivationDirectionLabel(
          relation.meta.threadDerivationKind,
          direction === 'source' ? 'outgoing' : 'incoming',
        )
      : RELATION_LABELS[relationType];
  const metaLabel =
    relationType === 'derives_from' && relation.meta?.threadDerivationKind
      ? getThreadDerivationKindLabel(relation.meta.threadDerivationKind)
      : relationType === 'clues_for' && relation.meta?.clueStrength
        ? getClueStrengthLabel(relation.meta.clueStrength)
      : label;

  return (
    <li className="flex items-center gap-2 rounded-md border border-surface-100 bg-surface-50 px-3 py-2 text-sm">
      <span className="text-surface-400 text-xs font-mono">{directionLabel}</span>
      <span className="rounded-full bg-surface-200 px-2 py-0.5 text-xs text-surface-600">
        {relationBadgeLabel}
      </span>
      <button
        type="button"
        className={`min-w-0 flex-1 truncate text-left font-medium ${
          canOpen
            ? 'text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500/30'
            : 'text-surface-700'
        }`}
        onClick={handleOpenTarget}
        disabled={!canOpen}
        title={canOpen ? `Otwórz detail: ${other.name}` : other.name}
        aria-label={`Przejdź do: ${other.name}`}
      >
        {other.name}
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {canOpen && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-surface-500 ring-1 ring-inset ring-surface-200">
            Detail
          </span>
        )}
        {metaLabel && (
          <span className="max-w-24 truncate text-xs italic text-surface-400">{metaLabel}</span>
        )}
        <EntityTypeBadge
          type={other.type}
          size="sm"
          onClick={canOpen ? handleOpenTarget : undefined}
          ariaLabel={canOpen ? `Otwórz detail ${other.name}` : undefined}
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Usuń relację"
          className="shrink-0 rounded p-0.5 text-surface-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

interface RelationListProps {
  entityId: string;
  onNavigate?: (entity: Entity) => void;
  includeRelationTypes?: RelationType[];
  excludeRelationTypes?: RelationType[];
  emptyMessage?: string;
}

export function RelationList({
  entityId,
  onNavigate,
  includeRelationTypes,
  excludeRelationTypes,
  emptyMessage = 'Brak relacji.',
}: RelationListProps) {
  const relations = useRelations(entityId);
  const visibleRelations = relations.filter((relation) => {
    if (includeRelationTypes && !includeRelationTypes.includes(relation.type)) {
      return false;
    }

    if (excludeRelationTypes?.includes(relation.type)) {
      return false;
    }

    return true;
  });

  if (!visibleRelations || visibleRelations.length === 0) {
    return (
      <InlineEmptyState
        message={emptyMessage}
        icon={<LinkIcon className="h-4 w-4" />}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1.5" aria-label="Relacje encji">
      {visibleRelations.map((rel) => (
        <RelationRow
          key={rel.id}
          relation={rel}
          relationId={rel.id}
          relationType={rel.type}
          otherId={rel.sourceId === entityId ? rel.targetId : rel.sourceId}
          label={rel.label}
          direction={rel.sourceId === entityId ? 'source' : 'target'}
          onNavigate={onNavigate}
          onDeleted={() => {}} // useLiveQuery auto-updates
        />
      ))}
    </ul>
  );
}
