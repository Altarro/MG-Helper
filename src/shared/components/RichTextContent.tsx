import { useMemo, useState, type MouseEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { ENTITY_TYPES, type Entity, type EntityType } from '@shared/types/entity';
import type { Relation, RelationType } from '@shared/types/relation';
import { formatDateTime } from '@shared/utils/date';
import { getEntityTypeLabel } from '@shared/utils/entityTypeMeta';
import { Modal } from './Modal';

interface RichTextContentProps {
  html: string;
  className?: string;
}

interface EntityPreviewState {
  entityId: string;
  entityType: EntityType;
}

interface PreviewRelation {
  relation: Relation;
  other: Entity;
  direction: 'outgoing' | 'incoming';
}

const RELATION_LABELS: Record<RelationType, string> = {
  contains: 'Zawiera',
  belongs_to: 'Należy do',
  tracks: 'Śledzi',
  appears_in: 'Pojawia się w',
  owns: 'Posiada',
  related_to: 'Powiązany z',
  clues_for: 'Wskazówka do',
  derives_from: 'Wynika z',
  affects: 'Powiązanie fabularne',
};

const RELATIONS_PREVIEW_LIMIT = 6;

function isEntityType(value: string | null): value is EntityType {
  return value !== null && ENTITY_TYPES.includes(value as EntityType);
}

function findEntityLink(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLAnchorElement>('a[data-entity-id][data-entity-type]');
}

function relationPrefix(relation: Relation, direction: PreviewRelation['direction']): string {
  return direction === 'outgoing'
    ? RELATION_LABELS[relation.type]
    : `Źródło relacji: ${RELATION_LABELS[relation.type]}`;
}

function preventPreviewLinkClick(event: MouseEvent<HTMLDivElement>) {
  if (event.target instanceof Element && event.target.closest('a')) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function ReadOnlyRichTextPreview({ html }: { html: string }) {
  return (
    <div
      className="rich-text-content prose prose-sm text-surface-700 max-w-none rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-white/45 px-4 py-3"
      data-readonly-links="true"
      onClick={preventPreviewLinkClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function EntityPreviewHeader({ entity }: { entity: Entity }) {
  return (
    <div className="rounded-[1.1rem] border border-[rgba(86,93,94,0.14)] bg-[rgba(243,244,239,0.78)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="app-pill rounded-full px-2.5 py-1 text-xs font-semibold">
          {getEntityTypeLabel(entity.type)}
        </span>
        {entity.tags.map((tag) => (
          <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
            {tag}
          </span>
        ))}
      </div>
      <p className="text-surface-500 mt-2 text-xs">
        Edytowano: {formatDateTime(entity.updatedAt)}
      </p>
    </div>
  );
}

function EntityRelationsSection({ relations }: { relations: PreviewRelation[] | undefined }) {
  if (relations === undefined) {
    return (
      <section className="rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(243,244,239,0.72)] px-4 py-3">
        <h3 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
          Relacje
        </h3>
        <p className="text-surface-500 text-sm">Ładowanie relacji...</p>
      </section>
    );
  }

  const visibleRelations = relations.slice(0, RELATIONS_PREVIEW_LIMIT);
  const hiddenCount = relations.length - visibleRelations.length;

  return (
    <section className="rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(243,244,239,0.72)] px-4 py-3">
      <h3 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
        Relacje
      </h3>
      {relations.length === 0 ? (
        <p className="text-surface-500 text-sm">Brak relacji dla tej encji.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleRelations.map(({ relation, other, direction }) => (
            <span
              key={relation.id}
              className="app-pill-muted inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            >
              <span className="text-surface-500 shrink-0 font-semibold">
                {relationPrefix(relation, direction)}
              </span>
              <span className="text-surface-800 min-w-0 truncate font-medium">{other.name}</span>
              <span className="text-surface-500 shrink-0">({getEntityTypeLabel(other.type)})</span>
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs text-surface-600">
              +{hiddenCount} więcej
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function EntityPreviewModal({ preview, onClose }: { preview: EntityPreviewState; onClose: () => void }) {
  const { db } = useCampaign();
  const entity = useLiveQuery(() => db.entities.get(preview.entityId), [db, preview.entityId]);
  const title = entity?.name ?? 'Podgląd encji';
  const relations = useLiveQuery(async () => {
    const rels = await db.relations
      .filter((relation) => relation.sourceId === preview.entityId || relation.targetId === preview.entityId)
      .toArray();

    const rows = await Promise.all(
      rels.map(async (relation): Promise<PreviewRelation | null> => {
        const otherId = relation.sourceId === preview.entityId ? relation.targetId : relation.sourceId;
        const other = await db.entities.get(otherId);
        if (!other) return null;
        return {
          relation,
          other,
          direction: relation.sourceId === preview.entityId ? 'outgoing' : 'incoming',
        };
      }),
    );

    return rows.filter((row): row is PreviewRelation => row !== null);
  }, [db, preview.entityId]);

  return (
    <Modal title={title} size="lg" onClose={onClose}>
      {entity === undefined ? (
        <div className="rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(243,244,239,0.72)] px-4 py-3">
          <p className="text-surface-500 text-sm">Ładowanie podglądu...</p>
        </div>
      ) : entity && entity.type === preview.entityType ? (
        <div className="flex flex-col gap-3">
          <EntityPreviewHeader entity={entity} />
          {entity.description ? (
            <ReadOnlyRichTextPreview html={entity.description} />
          ) : (
            <p className="rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-white/45 px-4 py-3 text-sm text-surface-500">
              Ta encja nie ma jeszcze opisu.
            </p>
          )}
          <EntityRelationsSection relations={relations} />
        </div>
      ) : (
        <div className="rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(243,244,239,0.72)] px-4 py-3">
          <p className="text-surface-500 text-sm">Nie znaleziono tej encji.</p>
        </div>
      )}
    </Modal>
  );
}

export function RichTextContent({ html, className = '' }: RichTextContentProps) {
  const [preview, setPreview] = useState<EntityPreviewState | null>(null);
  const contentClassName = useMemo(
    () => ['rich-text-content', className].filter(Boolean).join(' '),
    [className],
  );

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const entityLink = findEntityLink(event.target);
    if (entityLink) {
      const entityId = entityLink.dataset.entityId;
      const entityType = entityLink.dataset.entityType ?? null;
      event.preventDefault();
      event.stopPropagation();

      if (entityId && isEntityType(entityType)) {
        setPreview({ entityId, entityType });
      }
      return;
    }

    const anyLink = event.target instanceof Element ? event.target.closest('a') : null;
    if (anyLink) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <>
      <div
        className={contentClassName}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {preview && (
        <EntityPreviewModal
          preview={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
