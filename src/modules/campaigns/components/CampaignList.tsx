import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { nanoid } from 'nanoid';
import { CampaignCard } from './CampaignCard';
import { CampaignForm } from './CampaignForm';
import { EmptyState } from '@shared/components/EmptyState';
import {
  listCampaigns,
  saveCampaign,
} from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { CampaignMeta } from '@shared/types/campaign';
import type { CampaignFormValues } from './CampaignForm';

export function CampaignList() {
  const navigate = useNavigate();
  const { setActiveCampaign } = useCampaign();

  const [campaigns, setCampaigns] = useState<CampaignMeta[]>(() => listCampaigns());
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<CampaignMeta | null>(null);
  const [saving, setSaving] = useState(false);

  function refresh() {
    setCampaigns(listCampaigns());
  }

  async function handleCreate(values: CampaignFormValues) {
    setSaving(true);
    try {
      const meta: CampaignMeta = {
        id: nanoid(),
        name: values.name,
        description: values.description ?? '',
        createdAt: new Date().toISOString(),
      };
      saveCampaign(meta);
      openCampaignDb(meta.id); // pre-open to register the DB
      setActiveCampaign(meta.id);
      toast.success(`Kampania „${meta.name}" utworzona`);
      setShowCreate(false);
      refresh();
      navigate('/');
    } catch {
      toast.error('Nie udało się utworzyć kampanii');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(values: CampaignFormValues) {
    if (!editTarget) return;
    setSaving(true);
    try {
      const updated: CampaignMeta = {
        ...editTarget,
        name: values.name,
        description: values.description ?? '',
      };
      saveCampaign(updated);
      toast.success('Nazwa kampanii zmieniona');
      setEditTarget(null);
      refresh();
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  }

  function handleOpen(id: string) {
    setActiveCampaign(id);
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Kampanie</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowa kampania
        </button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title="Brak kampanii"
          description="Utwórz pierwszą kampanię, aby zacząć."
          action={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Utwórz kampanię
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onOpen={handleOpen}
              onRename={setEditTarget}
              onDeleted={refresh}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CampaignForm
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editTarget && (
        <CampaignForm
          defaultValues={{ name: editTarget.name, description: editTarget.description }}
          saving={saving}
          onSubmit={handleEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
