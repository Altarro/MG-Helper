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
  type LucideIcon,
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
import { toastRemoveEntitySuccess, toastRemoveEntityError } from '@shared/utils/toastSessionEntity';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@shared/components/Modal';
import { NpcCampaignPickerModal } from './NpcCampaignPickerModal';
import { LocationPickerModal } from './LocationPickerModal';
import type { SessionFormValues } from './SessionForm';
import type { Entity } from '@shared/types/entity';
import { removeEntityFromSession } from '../utils/liveSessionCommands';
import { getSessionLifecycleStatus, type SessionData } from '../types';

function useSessionAppearances(db: MgHelperDb, sessionId: string | undefined) {
  return (
    useLiveQuery(async () => {
      if (!sessionId)
        return { npcs: [], locations: [], items: [], threads: [], clues: [], threats: [] };
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((relation) => relation.type === 'appears_in')
        .toArray();
      const entities = await Promise.all(
        rels.map((relation) => getEntityById(db, relation.sourceId)),
      );
      const valid = entities.filter((entity): entity is Entity => entity !== undefined);
      return {
        npcs: valid.filter((entity) => entity.type === 'npc'),
        locations: valid.filter(isNamedLocation),
        items: valid.filter((entity) => entity.type === 'item'),
        threads: valid.filter((entity) => entity.type === 'thread'),
        clues: valid.filter((entity) => entity.type === 'clue'),
        threats: valid.filter((entity) => entity.type === 'threat'),
      };
    }, [db, sessionId]) ?? {
      npcs: [],
      locations: [],
      items: [],
      threads: [],
      clues: [],
      threats: [],
    }
  );
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

  const entities =
    useLiveQuery(() => db.entities.where('type').equals(entityType).toArray(), [db, entityType]) ??
    [];

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
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.72)] px-3 py-2.5">
        <Search className="text-surface-500 h-3.5 w-3.5" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj..."
          className="text-surface-800 placeholder:text-surface-500 w-full bg-transparent text-sm outline-none"
          autoFocus
        />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-2xl border border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.55)]">
        {filtered.length === 0 ? (
          <p className="text-surface-500 p-4 text-sm">
            {available.length === 0 ? 'Wszystkie encje tego typu są już w sesji.' : 'Brak wyników.'}
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(86,93,94,0.08)]">
            {filtered.map((entity) => (
              <li key={entity.id}>
                <label className="text-surface-800 flex cursor-pointer items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-[rgba(223,225,218,0.72)]">
                  <input
                    type="checkbox"
                    checked={selected.has(entity.id)}
                    onChange={() => toggle(entity.id)}
                    className="border-surface-300 accent-primary-600 h-4 w-4 rounded"
                  />
                  <span className="truncate">{entity.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[rgba(86,93,94,0.1)] pt-3">
        <span className="text-surface-600 text-xs">
          {selected.size > 0 ? `Wybrano: ${selected.size}` : 'Wybierz encje do dodania'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary rounded-xl px-3 py-2 text-sm"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={selected.size === 0 || saving}
            className="app-button-primary rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Dodaj
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NotesSection({ sessionId }: { sessionId: string }) {
  const notes = useNotesBySession(sessionId);
  if (!notes || notes.length === 0) return null;

  return (
    <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
      <h3 className="text-surface-500 mb-4 text-sm font-semibold tracking-[0.18em] uppercase">
        Notatki z sesji
      </h3>
      <ul className="flex flex-col gap-2.5">
        {notes.map((note) => (
          <li key={note.id}>
            <Link
              to={`/notes/${note.id}`}
              className="text-surface-800 block rounded-2xl border border-[rgba(210,166,67,0.18)] bg-[rgba(242,196,88,0.08)] px-4 py-3 text-sm leading-6 transition-colors hover:bg-[rgba(242,196,88,0.14)]"
            >
              <span className="line-clamp-3">{note.data.content}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SessionEntityColumnProps {
  title: string;
  count: number;
  icon: LucideIcon;
  items: Entity[];
  hrefBase: string;
  onAdd: () => void;
  accent?: 'default' | 'gold';
}

function SessionEntityColumn({
  title,
  count,
  icon: Icon,
  items,
  hrefBase,
  onAdd,
  onRemove,
  accent = 'default',
}: SessionEntityColumnProps & { onRemove?: (id: string, name: string) => void }) {
  const iconShellClass =
    accent === 'gold'
      ? 'bg-[rgba(242,196,88,0.16)] text-[#9a6710]'
      : 'bg-[rgba(33,71,102,0.09)] text-primary-700';

  return (
    <div className="app-card rounded-[1.5rem] p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconShellClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-primary-900 text-sm font-semibold tracking-[-0.02em]">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="text-surface-600 hover:text-primary-700 rounded-xl border border-[rgba(86,93,94,0.12)] p-1.5 transition-colors hover:bg-[rgba(223,225,218,0.75)]"
          title={`Dodaj do sesji: ${title}`}
          aria-label={`Dodaj do sesji: ${title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="app-pill-muted ml-auto rounded-full px-2.5 py-1 text-xs">{count}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-surface-500 text-xs">Brak w sesji</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center pl-0 pr-0 relative">
              <Link
                to={`${hrefBase}/${item.id}`}
                className="text-primary-800 hover:text-primary-900 text-sm leading-6 transition-colors hover:underline flex-1 min-w-0 pl-0"
              >
                {item.name}
              </Link>
              {onRemove && (
                <button
                  type="button"
                  className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 rounded p-1.5 hover:bg-[rgba(223,225,218,0.75)] transition-all focus:opacity-100"
                  style={{marginRight: '0.25rem'}} // 1rem = 16px, 0.25rem = 4px, matches left padding
                  title={`Usuń z sesji: ${item.name}`}
                  aria-label={`Usuń z sesji: ${item.name}`}
                  onClick={() => onRemove(item.id, item.name)}
                  tabIndex={0}
                >
                  <X className="h-3.5 w-3.5 text-danger-600" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  const [confirmReportOverwrite, setConfirmReportOverwrite] = useState(false);
  const blockingCleanupSession = useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('session').toArray();
    return all.find(
      (entity) =>
        entity.id !== id &&
        getSessionLifecycleStatus(entity.data as unknown as SessionData) === 'cleanup_pending',
    );
  }, [db, id]);

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

  // Generyczny handler usuwania encji z sesji dla wszystkich typów
  function handleRemoveEntityFromSession(entityType: string) {
    return async (entityId: string, entityName: string) => {
      try {
        const removed = await removeEntityFromSession(db, entityId, id!);
        if (!removed) return;
        toast.success(toastRemoveEntitySuccess(entityType, entityName));
      } catch {
        toast.error(toastRemoveEntityError(entityType));
      }
    };
  }

  const title = session.name || `Sesja ${session.data.number}`;
  const reportStatusLabel =
    (session.data as unknown as SessionData).reportAvailable === true
      ? 'Raport dostępny'
      : 'Brak raportu (po ponownym uruchomieniu sesji)';
  const formattedDate = session.data.date
    ? format(parseISO(session.data.date), 'd MMMM yyyy', { locale: pl })
    : '';

  async function handleUpdate(values: SessionFormValues) {
    if (!session) return;
    setSaving(true);
    try {
      await updateEntity(db, session!.id, {
        name: values.name || `Sesja ${values.number}`,
        description: values.description,
        tags: values.tags,
        data: {
          ...(session.data as unknown as SessionData),
          number: values.number,
          date: values.date,
          summary: values.summary,
          plannedDurationMin: values.plannedDurationMin,
          scenes: values.scenes,
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

  async function startLiveNow() {
    if (!session) return;
    await updateEntity(db, session.id, {
      data: {
        ...(session.data as unknown as SessionData),
        reportAvailable: false,
        reportGeneratedAt: undefined,
        liveRunStartedAt: new Date().toISOString(),
        liveRunEndedAt: undefined,
        spotlightSummary: undefined,
      },
    });
    void navigate(`/sessions/${session.id}/live`);
  }

  function handleStartLive() {
    if (!session) return;
    if (blockingCleanupSession) {
      const blockedTitle =
        blockingCleanupSession.name ||
        `Sesja ${(blockingCleanupSession.data as { number?: number }).number ?? '?'}`;
      toast.error(
        `Dokończ najpierw sprzątanie: ${blockedTitle}. Start nowej sesji na żywo jest zablokowany.`,
      );
      void navigate(`/sessions/${blockingCleanupSession.id}/cleanup`);
      return;
    }
    const data = session.data as unknown as SessionData;
    if (data.reportAvailable) {
      setConfirmReportOverwrite(true);
      return;
    }
    void startLiveNow();
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
    <div className="flex flex-col gap-6">
      <Link
        to="/sessions"
        className="text-surface-600 hover:text-primary-800 flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm transition-colors hover:bg-[rgba(223,225,218,0.72)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Sesje
      </Link>

      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-primary-700 mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Sesja
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(33,71,102,0.09)]">
                <BookOpen className="text-primary-700 h-5 w-5" />
              </div>
              <div>
                <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.1rem]">
                  {title}
                </h1>
                {formattedDate && (
                  <p className="text-surface-600 mt-2 text-sm leading-7">{formattedDate}</p>
                )}
                <p className="mt-2">
                  <span className="rounded-full border border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.75)] px-2.5 py-1 text-xs text-surface-700">
                    {reportStatusLabel}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/sessions/${session.id}/report`}
              className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              <FileText className="h-4 w-4" />
              Raport
            </Link>
            <Link
              to="#"
              onClick={(event) => {
                event.preventDefault();
                handleStartLive();
              }}
              className="app-accent inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            >
              <Zap className="h-4 w-4" />
              Na żywo
            </Link>
            <Link
              to={`/sessions/${session.id}/cleanup`}
              className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              <MapPin className="h-4 w-4" />
              Sprzątaj sesję
            </Link>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" />
                  Anuluj
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4" />
                  Edytuj
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="app-button-danger inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Usuń
            </button>
          </div>
        </div>
      </section>

      {isEditing && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">
              Edytuj sesję
            </h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-surface-500 hover:text-primary-700 rounded-xl p-2 transition-colors hover:bg-[rgba(223,225,218,0.75)]"
              aria-label="Zamknij formularz edycji sesji"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <SessionForm
            defaultValues={{
              number: session.data.number,
              date: session.data.date,
              name: session.name,
              summary: session.data.summary,
              plannedDurationMin: session.data.plannedDurationMin,
              scenes: session.data.scenes ?? [],
              description: session.description,
              tags: session.tags,
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {!isEditing && session.data.summary && (
        <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-[0.18em] uppercase">
            Streszczenie
          </h2>
          <p className="text-surface-800 max-w-[90ch] text-sm leading-7">{session.data.summary}</p>
        </section>
      )}

      {!isEditing && (session.data.plannedDurationMin || (session.data.scenes?.length ?? 0) > 0) && (
        <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-[0.18em] uppercase">
            Sceny
          </h2>
          {session.data.plannedDurationMin && (
            <p className="mb-3 text-sm text-surface-700">
              Planowany czas sesji: <span className="font-semibold">{session.data.plannedDurationMin} min</span>
            </p>
          )}
          {(session.data.scenes?.length ?? 0) > 0 ? (
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {(session.data.scenes ?? []).map((scene, index) => (
                <li key={`${scene.name}-${index}`} className="text-sm text-surface-800">
                  <p className="font-medium">{scene.name} <span className="text-surface-500">({scene.estimatedDurationMin} min)</span></p>
                  {scene.goal && <p className="text-xs text-surface-600">{scene.goal}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-surface-500">Brak scen.</p>
          )}
        </section>
      )}

      {!isEditing && session.description && (
        <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-[0.18em] uppercase">
            Notatki
          </h2>
          <div
            className="prose prose-sm text-surface-800 max-w-none"
            dangerouslySetInnerHTML={{ __html: session.description }}
          />
        </section>
      )}

      {!isEditing && session.tags.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {session.tags.map((tag) => (
            <span key={tag} className="app-pill rounded-full px-3 py-1.5 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {!isEditing && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <SessionEntityColumn
            title="Postacie"
            count={appearances.npcs.length}
            icon={Users}
            items={appearances.npcs}
            hrefBase="/npcs"
            onAdd={() => setNpcPickerOpen(true)}
            onRemove={handleRemoveEntityFromSession('npc')}
          />
          <SessionEntityColumn
            title="Lokacje"
            count={appearances.locations.length}
            icon={MapPin}
            items={appearances.locations}
            hrefBase="/locations"
            onAdd={() => setLocationPickerOpen(true)}
            onRemove={handleRemoveEntityFromSession('location')}
          />
          <SessionEntityColumn
            title="Przedmioty"
            count={appearances.items.length}
            icon={Package}
            items={appearances.items}
            hrefBase="/items"
            onAdd={() => setItemPickerOpen(true)}
            onRemove={handleRemoveEntityFromSession('item')}
          />
          <SessionEntityColumn
            title="Wątki"
            count={appearances.threads.length}
            icon={GitBranch}
            items={appearances.threads}
            hrefBase="/threads"
            onAdd={() => setThreadPickerOpen(true)}
            onRemove={handleRemoveEntityFromSession('thread')}
          />
          <SessionEntityColumn
            title="Wskazówki"
            count={appearances.clues.length}
            icon={Lightbulb}
            items={appearances.clues}
            hrefBase="/clues"
            onAdd={() => setCluePickerOpen(true)}
            onRemove={handleRemoveEntityFromSession('clue')}
          />
          <SessionEntityColumn
            title="Zagrożenia"
            count={appearances.threats.length}
            icon={AlertTriangle}
            items={appearances.threats}
            hrefBase="/threats"
            onAdd={() => setThreatPickerOpen(true)}
            onRemove={handleRemoveEntityFromSession('threat')}
            accent="gold"
          />
        </section>
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

      <ConfirmDialog
        open={confirmReportOverwrite}
        title="Uruchomić sesję ponownie?"
        description="Raport tej sesji zostanie nadpisany przy nowym przebiegu."
        confirmLabel="Tak, uruchom ponownie"
        cancelLabel="Anuluj"
        destructive={false}
        onConfirm={() => {
          setConfirmReportOverwrite(false);
          void startLiveNow();
        }}
        onCancel={() => setConfirmReportOverwrite(false)}
      />
    </div>
  );
}
