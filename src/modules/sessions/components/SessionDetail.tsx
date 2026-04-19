import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  X,
  BookOpen,
  MapPin,
  Users,
  Package,
  Zap,
  GitBranch,
  Lightbulb,
  FileText,
  AlertTriangle,
  Plus,
  Search,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useSessionById } from '../hooks/useSessionById';
import { SessionForm } from './SessionForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { useNotesBySession } from '@modules/notes/hooks/useNotesBySession';
import { isNamedLocation } from '@modules/locations/types';
import { addRelation, deleteEntity, updateEntity, getEntityById } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import type { MgHelperDb } from '@shared/db/database';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@shared/components/Modal';
import { NpcCampaignPickerModal } from './NpcCampaignPickerModal';
import { LocationPickerModal } from './LocationPickerModal';
import type { SessionFormValues } from './SessionForm';
import type { Entity } from '@shared/types/entity';

// ── Related entities aggregated from appears_in relations ─────────────────────

function useSessionAppearances(db: MgHelperDb, sessionId: string | undefined) {
  return useLiveQuery(async () => {
    if (!sessionId) return { npcs: [], locations: [], items: [], threads: [], clues: [], threats: [] };
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    const valid = entities.filter((e): e is Entity => e !== undefined);
    return {
      npcs: valid.filter((e) => e.type === 'npc'),
      locations: valid.filter(isNamedLocation),
      items: valid.filter((e) => e.type === 'item'),
      threads: valid.filter((e) => e.type === 'thread'),
      clues: valid.filter((e) => e.type === 'clue'),
      threats: valid.filter((e) => e.type === 'threat'),
    };
  }, [db, sessionId]) ?? { npcs: [], locations: [], items: [], threads: [], clues: [], threats: [] };
}

type PickableEntityType = 'item' | 'thread' | 'clue' | 'threat';

interface CampaignEntityPickerModalProps {
  title: string;
  entityType: PickableEntityType;
  excludedIds: Set<string>;
  onAdd: (entityIds: string[]) => Promise<void>;
  onClose: () => void;
}

function CampaignEntityPickerModal({
  title,
  entityType,
  excludedIds,
  onAdd,
  onClose,
}: CampaignEntityPickerModalProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const entities = useLiveQuery(
    () => db.entities.where('type').equals(entityType).toArray(),
    [db, entityType],
  ) ?? [];

  const available = entities.filter((entity) => !excludedIds.has(entity.id));
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? available.filter((entity) => entity.name.toLowerCase().includes(normalizedQuery))
    : available;

  function toggle(entityId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      await onAdd([...selected]);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} size="md" onClose={onClose}>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-surface-200 px-2.5 py-2">
        <Search className="h-3.5 w-3.5 text-surface-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj..."
          className="w-full text-sm outline-none placeholder:text-surface-400"
          autoFocus
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-surface-200">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-surface-400">
            {available.length === 0 ? 'Wszystkie encje tego typu są już w sesji.' : 'Brak wyników.'}
          </p>
        ) : (
          <ul className="divide-y divide-surface-100">
            {filtered.map((entity) => (
              <li key={entity.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50">
                  <input
                    type="checkbox"
                    checked={selected.has(entity.id)}
                    onChange={() => toggle(entity.id)}
                    className="h-4 w-4 rounded border-surface-300 accent-primary-600"
                  />
                  <span className="truncate text-surface-800">{entity.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3">
        <span className="text-xs text-surface-500">
          {selected.size > 0 ? `Wybrano: ${selected.size}` : 'Wybierz encje do dodania'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={selected.size === 0 || saving}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Dodaj
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── NotesSection ──────────────────────────────────────────────────────────────

function NotesSection({ sessionId }: { sessionId: string }) {
  const notes = useNotesBySession(sessionId);
  if (!notes || notes.length === 0) return null;
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-surface-700">Notatki z sesji</h3>
      <ul className="flex flex-col gap-1.5">
        {notes.map((note) => (
          <li key={note.id}>
            <Link
              to={`/notes/${note.id}`}
              className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-surface-700 hover:bg-amber-100"
            >
              <span className="line-clamp-3">{note.data.content}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const { session } = useSessionById(id);
  const appearances = useSessionAppearances(db, id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [npcPickerOpen, setNpcPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [threadPickerOpen, setThreadPickerOpen] = useState(false);
  const [cluePickerOpen, setCluePickerOpen] = useState(false);
  const [threatPickerOpen, setThreatPickerOpen] = useState(false);

  if (session === undefined) return <LoadingSpinner />;

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Sesja nie znaleziona.</p>
        <Link to="/sessions" className="text-primary-600 hover:underline">
          ← Powrót do sesji
        </Link>
      </div>
    );
  }

  const title = session.name || `Sesja ${session.data.number}`;
  const formattedDate = session.data.date
    ? format(parseISO(session.data.date), 'd MMMM yyyy', { locale: pl })
    : '';

  async function handleUpdate(values: SessionFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, session!.id, {
        name: values.name || `Sesja ${values.number}`,
        description: values.description,
        tags: values.tags,
        data: {
          number: values.number,
          date: values.date,
          summary: values.summary,
        },
      });
      toast.success('Sesja zaktualizowana');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, session!.id);
      toast.success(`${title} usunięta`);
      navigate('/sessions');
    } catch {
      toast.error('Nie udało się usunąć sesji');
    }
  }

  async function addEntitiesToSession(entityIds: string[]) {
    if (!id || entityIds.length === 0) return;
    try {
      const existing = await db.relations
        .where('targetId')
        .equals(id)
        .filter((relation) => relation.type === 'appears_in')
        .toArray();
      const existingIds = new Set(existing.map((relation) => relation.sourceId));
      const toAdd = entityIds.filter((entityId) => !existingIds.has(entityId));
      if (toAdd.length === 0) {
        toast.message('Wybrane encje są już w sesji');
        return;
      }
      await Promise.all(
        toAdd.map((entityId) =>
          addRelation(db, {
            type: 'appears_in',
            sourceId: entityId,
            targetId: id,
          }),
        ),
      );
      toast.success(`Dodano ${toAdd.length} encj${toAdd.length === 1 ? 'ę' : 'e'} do sesji`);
    } catch {
      toast.error('Nie udało się dodać encji do sesji');
    }
  }

  async function handleLocationSelect(locationId: string | null) {
    if (!locationId) return;
    await addEntitiesToSession([locationId]);
  }

  const appearanceIds = {
    items: new Set(appearances.items.map((entity) => entity.id)),
    threads: new Set(appearances.threads.map((entity) => entity.id)),
    clues: new Set(appearances.clues.map((entity) => entity.id)),
    threats: new Set(appearances.threats.map((entity) => entity.id)),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back */}
      <Link
        to="/sessions"
        className="flex w-fit items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
      >
        <ArrowLeft className="h-4 w-4" /> Sesje
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 shrink-0 text-primary-500" />
          <div>
            <h1 className="text-xl font-semibold text-surface-900">{title}</h1>
            <span className="text-sm text-surface-400">{formattedDate}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/sessions/${session.id}/report`}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <FileText className="h-3.5 w-3.5" /> Raport
          </Link>
          <Link
            to={`/sessions/${session.id}/live`}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Zap className="h-3.5 w-3.5" /> Na żywo
          </Link>
          <Link
            to={`/sessions/${session.id}/cleanup`}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <MapPin className="h-3.5 w-3.5" /> Sprzątaj sesję
          </Link>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            {isEditing ? (
              <><X className="h-3.5 w-3.5" /> Anuluj</>
            ) : (
              <><Edit2 className="h-3.5 w-3.5" /> Edytuj</>
            )}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <SessionForm
            defaultValues={{
              number: session.data.number,
              date: session.data.date,
              name: session.name,
              summary: session.data.summary,
              description: session.description,
              tags: session.tags,
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {/* Summary */}
      {!isEditing && session.data.summary && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Streszczenie
          </h2>
          <p className="text-sm text-surface-700">{session.data.summary}</p>
        </div>
      )}

      {/* Notes */}
      {!isEditing && session.description && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Notatki
          </h2>
          <div
            className="prose prose-sm max-w-none text-surface-700"
            dangerouslySetInnerHTML={{ __html: session.description }}
          />
        </div>
      )}

      {/* Tags */}
      {!isEditing && session.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {session.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Appearances */}
      {!isEditing && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Postacie */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Postacie</h3>
              <button
                type="button"
                onClick={() => setNpcPickerOpen(true)}
                className="rounded-md border border-surface-200 p-1 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                title="Dodaj postać z kampanii"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                {appearances.npcs.length}
              </span>
            </div>
            {appearances.npcs.length === 0 ? (
              <p className="text-xs text-surface-400">Brak</p>
            ) : (
              <ul className="space-y-1">
                {appearances.npcs.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/npcs/${e.id}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Locations */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Lokacje</h3>
              <button
                type="button"
                onClick={() => setLocationPickerOpen(true)}
                className="rounded-md border border-surface-200 p-1 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                title="Dodaj lokację z kampanii"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                {appearances.locations.length}
              </span>
            </div>
            {appearances.locations.length === 0 ? (
              <p className="text-xs text-surface-400">Brak</p>
            ) : (
              <ul className="space-y-1">
                {appearances.locations.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/locations/${e.id}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Przedmioty</h3>
              <button
                type="button"
                onClick={() => setItemPickerOpen(true)}
                className="rounded-md border border-surface-200 p-1 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                title="Dodaj przedmiot z kampanii"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                {appearances.items.length}
              </span>
            </div>
            {appearances.items.length === 0 ? (
              <p className="text-xs text-surface-400">Brak</p>
            ) : (
              <ul className="space-y-1">
                {appearances.items.map((e) => (
                  <li key={e.id}>
                    <Link to={`/items/${e.id}`} className="text-sm text-primary-600 hover:underline">
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Threads */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Wątki</h3>
              <button
                type="button"
                onClick={() => setThreadPickerOpen(true)}
                className="rounded-md border border-surface-200 p-1 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                title="Dodaj wątek z kampanii"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                {appearances.threads.length}
              </span>
            </div>
            {appearances.threads.length === 0 ? (
              <p className="text-xs text-surface-400">Brak</p>
            ) : (
              <ul className="space-y-1">
                {appearances.threads.map((e) => (
                  <li key={e.id} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: (e.data.color as string | undefined) ?? '#6366f1' }}
                    />
                    <Link to={`/threads/${e.id}`} className="text-sm text-primary-600 hover:underline">
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Clues */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Wskazówki</h3>
              <button
                type="button"
                onClick={() => setCluePickerOpen(true)}
                className="rounded-md border border-surface-200 p-1 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                title="Dodaj wskazówkę z kampanii"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                {appearances.clues.length}
              </span>
            </div>
            {appearances.clues.length === 0 ? (
              <p className="text-xs text-surface-400">Brak</p>
            ) : (
              <ul className="space-y-1">
                {appearances.clues.map((e) => (
                  <li key={e.id}>
                    <Link to={`/clues/${e.id}`} className="text-sm text-primary-600 hover:underline">
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Threats */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Zagrożenia</h3>
              <button
                type="button"
                onClick={() => setThreatPickerOpen(true)}
                className="rounded-md border border-surface-200 p-1 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                title="Dodaj zagrożenie z kampanii"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                {appearances.threats.length}
              </span>
            </div>
            {appearances.threats.length === 0 ? (
              <p className="text-xs text-surface-400">Brak</p>
            ) : (
              <ul className="space-y-1">
                {appearances.threats.map((entity) => (
                  <li key={entity.id}>
                    <Link to={`/threats/${entity.id}`} className="text-sm text-primary-600 hover:underline">
                      {entity.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <NotesSection sessionId={id!} />

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń sesję"
        description={`Czy na pewno chcesz usunąć ${title}? Ta operacja jest nieodwracalna.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {id && npcPickerOpen && (
        <NpcCampaignPickerModal
          sessionId={id}
          locationId={null}
          onClose={() => setNpcPickerOpen(false)}
        />
      )}

      {id && locationPickerOpen && (
        <LocationPickerModal
          title="Dodaj lokację do sesji"
          emptySelectionLabel="Anuluj wybór"
          sessionId={id}
          currentLocationId={null}
          onSelect={(locationId) => void handleLocationSelect(locationId)}
          onClose={() => setLocationPickerOpen(false)}
        />
      )}

      {itemPickerOpen && (
        <CampaignEntityPickerModal
          title="Dodaj przedmioty z kampanii"
          entityType="item"
          excludedIds={appearanceIds.items}
          onAdd={addEntitiesToSession}
          onClose={() => setItemPickerOpen(false)}
        />
      )}

      {threadPickerOpen && (
        <CampaignEntityPickerModal
          title="Dodaj wątki z kampanii"
          entityType="thread"
          excludedIds={appearanceIds.threads}
          onAdd={addEntitiesToSession}
          onClose={() => setThreadPickerOpen(false)}
        />
      )}

      {cluePickerOpen && (
        <CampaignEntityPickerModal
          title="Dodaj wskazówki z kampanii"
          entityType="clue"
          excludedIds={appearanceIds.clues}
          onAdd={addEntitiesToSession}
          onClose={() => setCluePickerOpen(false)}
        />
      )}

      {threatPickerOpen && (
        <CampaignEntityPickerModal
          title="Dodaj zagrożenia z kampanii"
          entityType="threat"
          excludedIds={appearanceIds.threats}
          onAdd={addEntitiesToSession}
          onClose={() => setThreatPickerOpen(false)}
        />
      )}
    </div>
  );
}
