import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { Modal } from '@shared/components/Modal';
import { getNpcData, isPlayerNpc } from '@shared/utils/entityData';
import { isNpc } from '@modules/npcs/types';

interface NpcPreviewModalProps {
  npcId: string;
  sessionId: string;
  onClose: () => void;
}

export function NpcPreviewModal({ npcId, sessionId, onClose }: NpcPreviewModalProps) {
  const { db } = useCampaign();
  const npc = useLiveQuery(() => db.entities.get(npcId), [db, npcId]);

  if (!npc || !isNpc(npc)) return null;

  const data = getNpcData(npc);
  const isPC = isPlayerNpc(npc);

  return (
    <Modal title={npc.name} size="md" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        {/* Badge */}
        <div className="flex items-center gap-2">
          {isPC ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Postać gracza
              {data.playerName ? ` — ${data.playerName}` : ''}
            </span>
          ) : (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">
              Postać niezależna
            </span>
          )}
        </div>

        {/* Fields */}
        {data.instinct && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Instynkt
            </p>
            <p className="text-sm text-surface-800">{data.instinct}</p>
          </div>
        )}
        {data.motivation && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Motywacja
            </p>
            <p className="text-sm text-surface-800">{data.motivation}</p>
          </div>
        )}
        {data.appearance && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Wygląd
            </p>
            <p className="text-sm text-surface-800">{data.appearance}</p>
          </div>
        )}
        {npc.description && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Opis
            </p>
            <p className="line-clamp-4 text-sm text-surface-700">{npc.description}</p>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="flex justify-end border-t border-surface-100 px-4 py-3">
        <Link
          to={`/npcs/${npcId}`}
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
