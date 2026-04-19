import { useState } from 'react';
import { FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { deleteCampaignMeta } from '@shared/db/campaignStore';
import { deleteCampaignDb } from '@shared/db/database';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { formatDate } from '@shared/utils/date';
import type { CampaignMeta } from '@shared/types/campaign';

interface CampaignCardProps {
  campaign: CampaignMeta;
  onOpen: (id: string) => void;
  onRename: (campaign: CampaignMeta) => void;
  onDeleted: () => void;
}

export function CampaignCard({ campaign, onOpen, onRename, onDeleted }: CampaignCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { campaignId } = useCampaign();
  const isActive = campaignId === campaign.id;

  async function handleDelete() {
    try {
      deleteCampaignMeta(campaign.id);
      await deleteCampaignDb(campaign.id);
      toast.success(`Kampania „${campaign.name}" usunięta`);
      onDeleted();
    } catch {
      toast.error('Nie udało się usunąć kampanii');
    }
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm ${
        isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-surface-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-surface-900">{campaign.name}</h3>
            {isActive && (
              <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                Aktywna
              </span>
            )}
          </div>
          {campaign.description && (
            <p className="line-clamp-2 text-sm text-surface-500">{campaign.description}</p>
          )}
          <p className="text-xs text-surface-400">
            Utworzona {formatDate(campaign.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpen(campaign.id)}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Otwórz
        </button>
        <button
          type="button"
          onClick={() => onRename(campaign)}
          className="flex items-center gap-1.5 rounded-md border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Zmień nazwę
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Usuń
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń kampanię"
        description={`Czy na pewno chcesz usunąć kampanię „${campaign.name}"? Wszystkie dane zostaną trwale usunięte.`}
        confirmLabel="Usuń"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
