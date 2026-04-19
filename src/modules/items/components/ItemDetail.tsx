import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, X, Package } from 'lucide-react';
import { useItemById } from '../hooks/useItemById';
import { ItemForm } from './ItemForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { NotesList } from '@modules/notes/components/NotesList';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { ITEM_TYPE_LABELS } from '../types';
import type { ItemFormValues } from './ItemForm';

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { item } = useItemById(id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/items';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Przedmioty';

  if (item === undefined) return <LoadingSpinner />;
  if (!item) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Przedmiot nie znaleziony.</p>
        <Link to="/items" className="text-primary-600 hover:underline">← Powrót</Link>
      </div>
    );
  }

  async function handleUpdate(values: ItemFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, item!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: { itemType: values.itemType, properties: values.properties },
      });
      toast.success('Przedmiot zaktualizowany');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, item!.id);
      toast.success(`Przedmiot „${item!.name}" usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link to={backPath} className="flex w-fit items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800">
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 shrink-0 text-amber-500" />
          <h1 className="text-xl font-semibold text-surface-900">{item.name}</h1>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {ITEM_TYPE_LABELS[item.data.itemType]}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50">
            {isEditing ? <><X className="h-3.5 w-3.5" /> Anuluj</> : <><Edit2 className="h-3.5 w-3.5" /> Edytuj</>}
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <ItemForm
            defaultValues={{ name: item.name, itemType: item.data.itemType, properties: item.data.properties, description: item.description, tags: item.tags }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {!isEditing && item.data.properties.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Właściwości</h2>
          <div className="flex flex-wrap gap-2">
            {item.data.properties.map((p, i) => (
              <span key={i} className="rounded-full bg-surface-100 px-3 py-0.5 text-sm text-surface-700">{p}</span>
            ))}
          </div>
        </div>
      )}

      {!isEditing && item.description && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Opis</h2>
          <div className="prose prose-sm max-w-none text-surface-700" dangerouslySetInnerHTML={{ __html: item.description }} />
        </div>
      )}

      {!isEditing && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <span key={t} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">{t}</span>
          ))}
        </div>
      )}

      <NotesList entityId={id!} />

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń przedmiot"
        description={`Czy na pewno chcesz usunąć przedmiot „${item.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
