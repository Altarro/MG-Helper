import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { Modal } from '@shared/components/Modal';
import { isPlayerNpc } from '@shared/utils/entityData';
import { stripHtml } from '@shared/utils/sanitize';
import { isLocation, LOCATION_TYPE_LABELS } from '@modules/locations/types';
import { isNpc } from '@modules/npcs/types';

interface LocationPreviewModalProps {
  locationId: string;
  sessionId: string;
  onClose: () => void;
}

export function LocationPreviewModal({ locationId, sessionId, onClose }: LocationPreviewModalProps) {
  const { db } = useCampaign();

  const data = useLiveQuery(async () => {
    const location = await db.entities.get(locationId);
    if (!location || !isLocation(location)) return null;

    // child locations via `contains` relation
    const childRels = await db.relations
      .where('sourceId')
      .equals(locationId)
      .filter((r) => r.type === 'contains')
      .toArray();
    const childEntities = await Promise.all(childRels.map((r) => db.entities.get(r.targetId)));
    const existingChildren = childEntities.filter(
      (e): e is NonNullable<typeof e> => e !== undefined,
    );
    const children = existingChildren.filter(isLocation);

    // NPCs present via `contains` (parent = location, child = npc)
    const npcEntities = existingChildren.filter(isNpc);

    return { location, children, npcs: npcEntities };
  }, [db, locationId]);

  if (!data?.location) return null;

  const { location, children, npcs } = data;
  const locData = location.data;
  const typeLabel = LOCATION_TYPE_LABELS[locData.locationType];
  const descriptionPreview = stripHtml(location.description ?? '');

  return (
    <Modal title={location.name} size="md" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        {/* Type */}
        <span className="w-fit rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">
          {typeLabel}
        </span>

        {/* Senses */}
        {locData.senses && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {locData.senses.see && (
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Widzisz</p>
                <p className="line-clamp-2 text-sm text-surface-800">{locData.senses.see}</p>
              </div>
            )}
            {locData.senses.hear && (
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Słyszysz</p>
                <p className="line-clamp-2 text-sm text-surface-800">{locData.senses.hear}</p>
              </div>
            )}
            {locData.senses.smell && (
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Czujesz</p>
                <p className="line-clamp-2 text-sm text-surface-800">{locData.senses.smell}</p>
              </div>
            )}
            {locData.senses.feel && (
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Dotykasz</p>
                <p className="line-clamp-2 text-sm text-surface-800">{locData.senses.feel}</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {descriptionPreview && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">Opis</p>
            <p className="line-clamp-4 text-sm text-surface-700">{descriptionPreview}</p>
          </div>
        )}

        {/* Children */}
        {children.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Podlokacje ({children.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {children.map((c) => (
                <span
                  key={c.id}
                  className="rounded bg-surface-100 px-2 py-0.5 text-xs text-surface-700"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* NPCs present */}
        {npcs.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Postacie ({npcs.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {npcs.map((n) => (
                <span
                  key={n.id}
                  className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                >
                  {n.name}
                  {isPlayerNpc(n) ? ' · Gracz' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="flex justify-end border-t border-surface-100 px-4 py-3">
        <Link
          to={`/locations/${locationId}`}
          state={{ returnToSessionLive: sessionId }}
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
        >
          Pokaż szczegóły
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Modal>
  );
}
