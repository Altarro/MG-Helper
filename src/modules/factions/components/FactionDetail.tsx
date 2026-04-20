import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Edit2, Trash2, X, Flag, Users, MapPin } from 'lucide-react';
import { useFactionById } from '../hooks/useFactionById';
import { FactionForm } from './FactionForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { NotesList } from '@modules/notes/components/NotesList';
import { deleteEntity, updateEntity, getEntityById } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import type { MgHelperDb } from '@shared/db/database';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FactionFormValues } from './FactionForm';

function useFactionMembers(db: MgHelperDb, factionId: string | undefined) {
  return (
    useLiveQuery(async () => {
      if (!factionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(factionId)
        .filter((r) => r.type === 'belongs_to')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      return entities.filter(
        (e): e is NonNullable<typeof e> => e !== undefined && e.type === 'npc',
      );
    }, [db, factionId]) ?? []
  );
}

function useFactionLocations(db: MgHelperDb, factionId: string | undefined) {
  return (
    useLiveQuery(async () => {
      if (!factionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(factionId)
        .filter((r) => r.type === 'belongs_to')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      return entities.filter(
        (e): e is NonNullable<typeof e> => e !== undefined && e.type === 'location',
      );
    }, [db, factionId]) ?? []
  );
}

export function FactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const { faction } = useFactionById(id);
  const members = useFactionMembers(db, id);
  const locations = useFactionLocations(db, id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (faction === undefined) return <LoadingSpinner />;
  if (!faction) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <p className="text-surface-500">Frakcja nie znaleziona.</p>
        <Link
          to="/factions"
          className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Frakcje
        </Link>
      </div>
    );
  }

  async function handleUpdate(values: FactionFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, faction!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: { goals: values.goals, resources: values.resources },
      });
      toast.success('Frakcja zaktualizowana');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, faction!.id);
      toast.success(`Frakcja „${faction!.name}" usunięta`);
      navigate('/factions');
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <Link
        to="/factions"
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Frakcje
      </Link>

      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex items-center gap-4">
          <div className="app-panel text-primary-700 rounded-[1.25rem] p-3 shadow-[0_14px_28px_rgba(18,45,66,0.12)]">
            <Flag className="h-5 w-5 shrink-0" />
          </div>
          <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
            {faction.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            {isEditing ? (
              <>
                <X className="h-3.5 w-3.5" /> Anuluj
              </>
            ) : (
              <>
                <Edit2 className="h-3.5 w-3.5" /> Edytuj
              </>
            )}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <FactionForm
            defaultValues={{
              name: faction.name,
              goals: faction.data.goals,
              resources: faction.data.resources,
              description: faction.description,
              tags: faction.tags,
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {!isEditing && faction.data.goals.length > 0 && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
            Cele
          </h2>
          <ul className="list-inside list-disc space-y-1.5">
            {faction.data.goals.map((g, i) => (
              <li key={i} className="text-surface-700 text-sm">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEditing && faction.data.resources.length > 0 && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
            Zasoby
          </h2>
          <ul className="list-inside list-disc space-y-1.5">
            {faction.data.resources.map((r, i) => (
              <li key={i} className="text-surface-700 text-sm">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEditing && faction.description && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
            Opis
          </h2>
          <div
            className="prose prose-sm text-surface-700 max-w-none"
            dangerouslySetInnerHTML={{ __html: faction.description }}
          />
        </div>
      )}

      {!isEditing && faction.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {faction.tags.map((t) => (
            <span key={t} className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Members */}
      {!isEditing && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="text-surface-400 h-4 w-4" />
            <h2 className="text-surface-700 text-sm font-semibold">Członkowie (Postacie)</h2>
            <span className="app-pill-muted ml-auto rounded-full px-2 py-0.5 text-xs font-medium">
              {members.length}
            </span>
          </div>
          {members.length === 0 ? (
            <p className="text-surface-400 text-xs">
              Brak — przypisz postać do tej frakcji z widoku Postaci.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/npcs/${e.id}`}
                    className="app-input-shell text-surface-700 hover:border-primary-300 hover:text-primary-700 inline-flex w-full rounded-[1rem] px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {e.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Headquarters (locations) */}
      {!isEditing && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="text-surface-400 h-4 w-4" />
            <h2 className="text-surface-700 text-sm font-semibold">Siedziby (lokacje)</h2>
            <span className="app-pill-muted ml-auto rounded-full px-2 py-0.5 text-xs font-medium">
              {locations.length}
            </span>
          </div>
          {locations.length === 0 ? (
            <p className="text-surface-400 text-xs">
              Brak — przypisz lokację do tej frakcji z widoku lokacji.
            </p>
          ) : (
            <ul className="space-y-2">
              {locations.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/locations/${e.id}`}
                    className="app-input-shell text-surface-700 hover:border-primary-300 hover:text-primary-700 inline-flex w-full rounded-[1rem] px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {e.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <NotesList entityId={id!} />

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń frakcję"
        description={`Czy na pewno chcesz usunąć frakcję „${faction.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
