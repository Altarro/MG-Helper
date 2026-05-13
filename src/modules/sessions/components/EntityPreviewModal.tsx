import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { Modal } from '@shared/components/Modal';
import type { EntityType } from '@shared/types/entity';
import { getEntityDetailPath, getEntityTypeLabel } from '@shared/utils/entityTypeMeta';
import { stripHtml } from '@shared/utils/sanitize';
import { normalizeClueTypes } from '@modules/clues/types';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';

interface EntityPreviewModalProps {
  entityId: string;
  entityType: Exclude<EntityType, 'npc' | 'location' | 'threat' | 'session' | 'event' | 'faction'>;
  sessionId: string;
  onClose: () => void;
}

function renderTypeDetails(
  entityType: EntityPreviewModalProps['entityType'],
  data: Record<string, unknown>,
  campaignId: string,
) {
  if (entityType === 'thread') {
    const status = typeof data.status === 'string' ? data.status : 'active';
    const kind = typeof data.kind === 'string' ? data.kind : 'side';
    return (
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
          {status === 'completed' ? 'Zakończony' : 'Aktywny'}
        </span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
          {kind}
        </span>
      </div>
    );
  }
  if (entityType === 'clue') {
    const clueTypes = normalizeClueTypes(
      Array.isArray(data.clueTypes) ? data.clueTypes : data.clueType,
    );
    const discovered = data.discovered === true;
    return (
      <div className="flex flex-wrap gap-1">
        {clueTypes.map((type) => (
          <span key={type} className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
            {getCatalogLabelByValue('clueType', type, campaignId)}
          </span>
        ))}
        <span className={`rounded-full px-2 py-0.5 text-xs ${discovered ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-600'}`}>
          {discovered ? 'Odkryta' : 'Nieodkryta'}
        </span>
      </div>
    );
  }
  if (entityType === 'item') {
    const itemType = typeof data.itemType === 'string' ? data.itemType : null;
    return itemType ? (
      <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
        {getCatalogLabelByValue('itemType', itemType, campaignId)}
      </span>
    ) : null;
  }
  if (entityType === 'clock') {
    const segments = typeof data.segments === 'number' ? data.segments : null;
    const filled = typeof data.filled === 'number' ? data.filled : null;
    return (segments !== null && filled !== null) ? (
      <span className="w-fit rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
        {filled}/{segments} segmentów
      </span>
    ) : null;
  }
  if (entityType === 'front') {
    const category = typeof data.category === 'string' ? data.category : null;
    return category ? (
      <span className="w-fit rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{category}</span>
    ) : null;
  }
  return null;
}

export function EntityPreviewModal({ entityId, entityType, sessionId, onClose }: EntityPreviewModalProps) {
  const { db, campaignId } = useCampaign();
  const entity = useLiveQuery(() => db.entities.get(entityId), [db, entityId]);
  if (!entity || entity.type !== entityType) return null;

  const detailPath = getEntityDetailPath(entity.type, entity.id);
  const details = renderTypeDetails(entityType, entity.data as Record<string, unknown>, campaignId);
  const descriptionPreview = stripHtml(entity.description ?? '');

  return (
    <Modal title={entity.name} size="md" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <span className="w-fit rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">
          {getEntityTypeLabel(entity.type)}
        </span>
        {details}
        {descriptionPreview ? (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Opis</p>
            <p className="line-clamp-5 text-sm text-surface-700">{descriptionPreview}</p>
          </div>
        ) : (
          <p className="text-sm text-surface-400">Brak opisu.</p>
        )}
      </div>
      {detailPath && (
        <div className="flex justify-end border-t border-surface-100 px-4 py-3">
          <Link
            to={detailPath}
            state={{ returnToSessionLive: sessionId }}
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            Pokaż szczegóły
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </Modal>
  );
}
