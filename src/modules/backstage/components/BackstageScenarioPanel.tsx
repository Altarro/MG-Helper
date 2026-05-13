import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Eye, PencilLine, Plus, Trash2 } from 'lucide-react';
import { addEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import { sanitizeHtml, stripHtml } from '@shared/utils/sanitize';
import {
  BACKSTAGE_SCENARIO_NOTE_KIND,
  isBackstageScenarioNote,
  type Note,
  type NoteData,
} from '@modules/notes/types';

interface ScenarioScene {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  updatedAt: string;
}

interface ScenarioNoteData extends NoteData {
  kind: typeof BACKSTAGE_SCENARIO_NOTE_KIND;
  scenes: ScenarioScene[];
  cleanupDecision: 'keep';
}

type ScenarioNote = Note & { data: ScenarioNoteData };
type ScenarioMode = 'edit' | 'preview';

const EMPTY_SCENE_CONTENT = '<p></p>';
const AUTOSAVE_DELAY_MS = 700;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeScene(raw: unknown, index: number): ScenarioScene {
  const source = isRecord(raw) ? raw : {};
  const title = typeof source.title === 'string' ? source.title : `Scena ${index + 1}`;
  const content = typeof source.content === 'string' ? sanitizeHtml(source.content) : EMPTY_SCENE_CONTENT;
  const sortOrder = typeof source.sortOrder === 'number' ? source.sortOrder : index;
  const updatedAt = typeof source.updatedAt === 'string' ? source.updatedAt : nowISO();
  const id = typeof source.id === 'string' ? source.id : generateId();

  return { id, title, content, sortOrder, updatedAt };
}

function sortScenes(scenes: ScenarioScene[]): ScenarioScene[] {
  return [...scenes].sort((a, b) => a.sortOrder - b.sortOrder);
}

function createDefaultScene(): ScenarioScene {
  return {
    id: generateId(),
    title: 'Scena 1',
    content: EMPTY_SCENE_CONTENT,
    sortOrder: 0,
    updatedAt: nowISO(),
  };
}

function normalizeScenes(note: ScenarioNote | null): ScenarioScene[] {
  if (!note) return [];

  const rawScenes = Array.isArray(note?.data.scenes) ? note.data.scenes : [];
  const scenes = rawScenes.map(normalizeScene);

  if (scenes.length > 0) return sortScenes(scenes).map((scene, index) => ({ ...scene, sortOrder: index }));

  if (note.description && stripHtml(note.description).trim().length > 0) {
    return [
      {
        ...createDefaultScene(),
        content: sanitizeHtml(note.description),
      },
    ];
  }

  return [];
}

function composeScenarioHtml(scenes: ScenarioScene[]): string {
  return sortScenes(scenes)
    .map((scene, index) => {
      const title = scene.title.trim() || `Scena ${index + 1}`;
      const content = sanitizeHtml(scene.content || EMPTY_SCENE_CONTENT);
      return `<section data-scenario-scene-id="${escapeHtml(scene.id)}"><h2>${escapeHtml(title)}</h2>${content}</section>`;
    })
    .join('');
}

function buildScenarioData(existing: Note | undefined, scenes: ScenarioScene[]): ScenarioNoteData {
  const description = composeScenarioHtml(scenes);
  const existingData = (existing?.data ?? {}) as Partial<ScenarioNoteData>;

  return {
    ...existingData,
    kind: BACKSTAGE_SCENARIO_NOTE_KIND,
    content: stripHtml(description),
    sessionId: '',
    createdAt: typeof existingData.createdAt === 'string' ? existingData.createdAt : nowISO(),
    scenes,
    cleanupDecision: 'keep',
  };
}

export function BackstageScenarioPanel() {
  const { db } = useCampaign();
  const scenarioState = useLiveQuery(async () => {
    const note = await db.entities
      .where('type')
      .equals('note')
      .filter(isBackstageScenarioNote)
      .first();

    return { note: (note ?? null) as ScenarioNote | null };
  }, [db]);

  const [mode, setMode] = useState<ScenarioMode>('preview');
  const [scenes, setScenes] = useState<ScenarioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [sceneToDelete, setSceneToDelete] = useState<ScenarioScene | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveVersionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scenarioState === undefined || dirtyRef.current) return;

    const loadedScenes = normalizeScenes(scenarioState.note);
    setScenes(loadedScenes);
    setActiveSceneId((current) => {
      if (current && loadedScenes.some((scene) => scene.id === current)) return current;
      return loadedScenes[0]?.id ?? null;
    });
    hydratedRef.current = true;
  }, [scenarioState]);

  const activeScene = useMemo(
    () => scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0] ?? null,
    [activeSceneId, scenes],
  );
  const orderedScenes = useMemo(() => sortScenes(scenes), [scenes]);

  const persistScenes = useCallback(
    async (nextScenes: ScenarioScene[], version: number) => {
      const normalized = sortScenes(nextScenes).map((scene, index) => ({
        ...scene,
        title: scene.title,
        content: sanitizeHtml(scene.content || EMPTY_SCENE_CONTENT),
        sortOrder: index,
      }));
      const description = composeScenarioHtml(normalized);
      setIsSaving(true);

      try {
        const existing = await db.entities
          .where('type')
          .equals('note')
          .filter(isBackstageScenarioNote)
          .first();
        const data = buildScenarioData(existing, normalized);

        if (existing) {
          await updateEntity(db, existing.id, {
            name: 'Scenariusz',
            description,
            tags: existing.tags,
            data,
          });
        } else {
          await addEntity(db, {
            type: 'note',
            name: 'Scenariusz',
            description,
            tags: [],
            data,
          });
        }

        if (saveVersionRef.current === version) {
          dirtyRef.current = false;
          setSavedAt(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
        }
      } finally {
        if (saveVersionRef.current === version) setIsSaving(false);
      }
    },
    [db],
  );

  useEffect(() => {
    if (!hydratedRef.current || !dirtyRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const version = saveVersionRef.current;
    saveTimerRef.current = setTimeout(() => {
      void persistScenes(scenes, version);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [persistScenes, scenes]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const version = saveVersionRef.current;
    void persistScenes(scenes, version);
  }, [persistScenes, scenes]);

  function updateScenes(updater: (current: ScenarioScene[]) => ScenarioScene[]) {
    dirtyRef.current = true;
    saveVersionRef.current += 1;
    setScenes((current) => updater(current));
  }

  function handleAddScene() {
    const nextScene: ScenarioScene = {
      id: generateId(),
      title: `Scena ${scenes.length + 1}`,
      content: EMPTY_SCENE_CONTENT,
      sortOrder: scenes.length,
      updatedAt: nowISO(),
    };
    updateScenes((current) => [...current, nextScene]);
    setActiveSceneId(nextScene.id);
  }

  function handleTitleChange(title: string) {
    if (!activeScene) return;
    const updatedAt = nowISO();
    updateScenes((current) =>
      current.map((scene) => (scene.id === activeScene.id ? { ...scene, title, updatedAt } : scene)),
    );
  }

  function handleContentChange(content: string) {
    if (!activeScene) return;
    const updatedAt = nowISO();
    updateScenes((current) =>
      current.map((scene) => (scene.id === activeScene.id ? { ...scene, content, updatedAt } : scene)),
    );
  }

  function handleConfirmDelete() {
    if (!sceneToDelete) return;
    const deletedId = sceneToDelete.id;

    updateScenes((current) => {
      const next = current
        .filter((scene) => scene.id !== deletedId)
        .map((scene, index) => ({ ...scene, sortOrder: index }));
      setActiveSceneId((currentActive) => {
        if (currentActive !== deletedId) return currentActive;
        return next[0]?.id ?? null;
      });
      return next;
    });
    setSceneToDelete(null);
  }

  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest('a');
    if (link) event.preventDefault();
  }

  if (scenarioState === undefined) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-100/80 p-1 text-sm">
          {([
            ['preview', Eye, 'Podgląd całości'],
            ['edit', PencilLine, 'Edycja'],
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
                mode === value ? 'bg-white text-primary-800 shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-surface-500">
          {isSaving ? <span>Zapisywanie...</span> : null}
          {!isSaving && savedAt ? <span>Zapisano {savedAt}</span> : null}
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleAddScene}
              className="app-button-primary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Dodaj scenę
            </button>
          ) : null}
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-2 rounded-2xl border border-surface-200 bg-white p-3">
            {orderedScenes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-200 p-4 text-sm text-surface-500">
                Brak scen.
              </div>
            ) : (
              orderedScenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setActiveSceneId(scene.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    activeScene?.id === scene.id
                      ? 'border-primary-300 bg-primary-50 text-primary-900'
                      : 'border-surface-200 bg-white text-surface-700 hover:border-surface-300 hover:bg-surface-50'
                  }`}
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-surface-500">
                    Scena {index + 1}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">
                    {scene.title.trim() || `Scena ${index + 1}`}
                  </span>
                </button>
              ))
            )}
          </aside>

          <section className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            {activeScene ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-0 flex-1 text-sm font-medium text-surface-700">
                    Tytuł sceny
                    <input
                      type="text"
                      value={activeScene.title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      onBlur={flushSave}
                      className="mt-1 w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-base font-semibold text-surface-900 outline-none transition-colors focus:border-primary-300 focus:ring-2 focus:ring-primary-500/15"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setSceneToDelete(activeScene)}
                    className="inline-flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700 transition-colors hover:bg-danger-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Usuń scenę
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-surface-700">Treść sceny</div>
                  <RichTextEditor
                    value={activeScene.content}
                    onChange={handleContentChange}
                    onBlur={flushSave}
                    placeholder="Pisz scenariusz tej sceny..."
                    className="min-h-[22rem]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 text-center">
                <BookOpen className="mb-3 h-8 w-8 text-surface-300" aria-hidden />
                <p className="text-sm font-medium text-surface-700">Dodaj pierwszą scenę.</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="rounded-2xl border border-surface-200 bg-white px-5 py-6 shadow-sm sm:px-8 lg:px-12">
          {orderedScenes.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <BookOpen className="mb-4 h-10 w-10 text-primary-300" aria-hidden />
              <h2 className="text-2xl font-semibold text-surface-950">Napisz scenariusz swojej kampanii</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-surface-600">
                Dodaj pierwszą scenę, a podgląd całości ułoży tekst w spokojną, książkową formę.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('edit');
                  handleAddScene();
                }}
                className="app-button-primary mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Dodaj pierwszą scenę
              </button>
            </div>
          ) : (
            <div
              className="mx-auto max-w-3xl space-y-10"
              onClick={handlePreviewClick}
            >
              {orderedScenes.map((scene, index) => (
                <article key={scene.id} className="border-b border-surface-100 pb-10 last:border-b-0 last:pb-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">
                    Scena {index + 1}
                  </p>
                  <h2 className="mb-4 text-2xl font-semibold text-surface-950">
                    {scene.title.trim() || `Scena ${index + 1}`}
                  </h2>
                  <div
                    className="prose prose-lg max-w-none text-surface-800 prose-headings:text-surface-900 prose-a:pointer-events-none prose-a:text-primary-700"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(scene.content || EMPTY_SCENE_CONTENT) }}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={sceneToDelete !== null}
        title="Usunąć scenę?"
        description="Ta scena zniknie ze scenariusza i z podglądu całości."
        confirmLabel="Usuń scenę"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSceneToDelete(null)}
      />
    </div>
  );
}
