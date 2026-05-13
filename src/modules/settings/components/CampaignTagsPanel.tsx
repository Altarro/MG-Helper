import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Tags, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { useCampaign } from '@shared/db/CampaignContext';
import { deleteTagEverywhere, listTagUsage, renameTag, type TagUsage } from '@shared/db/tagOperations';

export function CampaignTagsPanel() {
  const { db } = useCampaign();
  const tagUsage = useLiveQuery(() => listTagUsage(db), [db]);
  const [editing, setEditing] = useState<TagUsage | null>(null);
  const [nextName, setNextName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TagUsage | null>(null);
  const [saving, setSaving] = useState(false);

  function startRename(item: TagUsage) {
    setEditing(item);
    setNextName(item.tag);
  }

  async function handleRename() {
    if (!editing || saving) return;
    setSaving(true);
    try {
      const count = await renameTag(db, editing.tag, nextName);
      toast.success(`Zmieniono tag w ${count} encjach`);
      setEditing(null);
      setNextName('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zmienić tagu');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      const count = await deleteTagEverywhere(db, deleteTarget.tag);
      toast.success(`Usunięto tag z ${count} encji`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć tagu');
    } finally {
      setSaving(false);
    }
  }

  const tags = tagUsage ?? [];

  return (
    <section className="app-panel rounded-[1.8rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-primary-700 mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
            <Tags className="h-3.5 w-3.5" aria-hidden />
            Tagi kampanii
          </div>
          <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">
            Zarządzanie tagami
          </h2>
          <p className="text-surface-700 mt-2 max-w-[68ch] text-sm leading-7">
            Zmień nazwę tagu albo usuń go ze wszystkich encji w bieżącej kampanii. Encje zostają bez zmian poza listą tagów.
          </p>
        </div>
        <span className="app-pill-muted rounded-full px-3 py-1 text-xs font-semibold">
          {tags.length} tagów
        </span>
      </div>

      {tags.length === 0 ? (
        <div className="mt-5 rounded-[1.15rem] border border-dashed border-surface-300 px-4 py-6 text-center text-sm text-surface-500">
          Brak tagów w bieżącej kampanii.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {tags.map((item) => (
            <div
              key={item.tag}
              className="app-input-shell flex flex-wrap items-center gap-3 rounded-[1.1rem] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-surface-900">{item.tag}</p>
                <p className="text-xs text-surface-500">Użycia: {item.count}</p>
              </div>
              <button
                type="button"
                onClick={() => startRename(item)}
                className="app-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Zmień nazwę
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(item)}
                className="app-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-danger-700"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Usuń
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="mt-5 rounded-[1.25rem] border border-primary-200 bg-primary-50/70 p-4">
          <label htmlFor="campaign-tag-rename" className="text-sm font-medium text-surface-800">
            Nowa nazwa tagu
          </label>
          <input
            id="campaign-tag-rename"
            value={nextName}
            onChange={(event) => setNextName(event.target.value)}
            className="app-input mt-2 w-full rounded-2xl px-3.5 py-3 text-sm"
            autoFocus
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="app-button-secondary rounded-xl px-4 py-2 text-sm font-medium"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleRename()}
              disabled={saving || nextName.trim().length === 0}
              className="app-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć tag z kampanii?"
        description={`Tag „${deleteTarget?.tag ?? ''}" zostanie usunięty ze wszystkich encji, które go używają.`}
        confirmLabel="Usuń tag"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => !saving && setDeleteTarget(null)}
      />
    </section>
  );
}
