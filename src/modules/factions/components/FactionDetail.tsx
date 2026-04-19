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
  return useLiveQuery(async () => {
    if (!factionId) return [];
    const rels = await db.relations
      .where('targetId')
      .equals(factionId)
      .filter((r) => r.type === 'belongs_to')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    return entities.filter((e): e is NonNullable<typeof e> => e !== undefined && e.type === 'npc');
  }, [db, factionId]) ?? [];
}

function useFactionLocations(db: MgHelperDb, factionId: string | undefined) {
  return useLiveQuery(async () => {
    if (!factionId) return [];
    const rels = await db.relations
      .where('targetId')
      .equals(factionId)
      .filter((r) => r.type === 'belongs_to')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    return entities.filter((e): e is NonNullable<typeof e> => e !== undefined && e.type === 'location');
  }, [db, factionId]) ?? [];
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
      <div className="p-6">
        <p className="text-surface-500">Frakcja nie znaleziona.</p>
        <Link to="/factions" className="text-primary-600 hover:underline">← Powrót</Link>
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
    <div className="flex flex-col gap-6 p-6">
      <Link to="/factions" className="flex w-fit items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800">
        <ArrowLeft className="h-4 w-4" /> Frakcje
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Flag className="h-6 w-6 shrink-0 text-primary-500" />
          <h1 className="text-xl font-semibold text-surface-900">{faction.name}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50">
            {isEditing ? <><X className="h-3.5 w-3.5" /> Anuluj</> : <><Edit2 className="h-3.5 w-3.5" /> Edytuj</>}
          </button>
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <FactionForm
            defaultValues={{ name: faction.name, goals: faction.data.goals, resources: faction.data.resources, description: faction.description, tags: faction.tags }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {!isEditing && faction.data.goals.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Cele</h2>
          <ul className="list-disc list-inside space-y-1.5">
            {faction.data.goals.map((g, i) => <li key={i} className="text-sm text-surface-700">{g}</li>)}
          </ul>
        </div>
      )}

      {!isEditing && faction.data.resources.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Zasoby</h2>
          <ul className="list-disc list-inside space-y-1.5">
            {faction.data.resources.map((r, i) => <li key={i} className="text-sm text-surface-700">{r}</li>)}
          </ul>
        </div>
      )}

      {!isEditing && faction.description && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Opis</h2>
          <div className="prose prose-sm max-w-none text-surface-700" dangerouslySetInnerHTML={{ __html: faction.description }} />
        </div>
      )}

      {!isEditing && faction.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {faction.tags.map((t) => <span key={t} className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700">{t}</span>)}
        </div>
      )}

      {/* Members */}
      {!isEditing && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-700">Członkowie (Postacie)</h2>
            <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">{members.length}</span>
          </div>
          {members.length === 0 ? (
            <p className="text-xs text-surface-400">Brak — przypisz postać do tej frakcji z widoku Postaci.</p>
          ) : (
            <ul className="space-y-1">
              {members.map((e) => (
                <li key={e.id}>
                  <Link to={`/npcs/${e.id}`} className="text-sm text-primary-600 hover:underline">{e.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Headquarters (locations) */}
      {!isEditing && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-700">Siedziby (lokacje)</h2>
            <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">{locations.length}</span>
          </div>
          {locations.length === 0 ? (
            <p className="text-xs text-surface-400">Brak — przypisz lokację do tej frakcji z widoku lokacji.</p>
          ) : (
            <ul className="space-y-1">
              {locations.map((e) => (
                <li key={e.id}>
                  <Link to={`/locations/${e.id}`} className="text-sm text-primary-600 hover:underline">{e.name}</Link>
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
