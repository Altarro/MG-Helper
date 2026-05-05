import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, User, MapPin, Dice5, Table2, WandSparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { useGeneratorPacks } from '@modules/generator/hooks/useGeneratorPacks';
import { useGeneratorRoll } from '@modules/generator/hooks/useGeneratorRoll';
import { appendGeneratorRollLog } from '@modules/generator/repository';
import {
  submitGeneratorFeedback,
  trackGeneratorEvent,
} from '@modules/generator/telemetry';
import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import {
  generatorSettingsKeys,
  migrateLegacyGeneratorSettings,
} from '@modules/generator/settingsMigration';
import {
  createLocationFromRoll,
  createNpcFromRoll,
  createSessionNoteFromRoll,
} from '@modules/generator/sessionIntegration';

const MODE_LABELS: Record<'character' | 'location' | 'eventTable' | 'customTable', string> = {
  character: 'Postac',
  location: 'Lokacja',
  eventTable: 'Tabela zdarzen',
  customTable: 'Tabela wlasna',
};

const MODE_HINTS: Record<'character' | 'location' | 'eventTable' | 'customTable', string> = {
  character: 'Imie | Przydomek | Nazwisko',
  location: 'Typ | Nazwa',
  eventTable: 'Losowe zdarzenie sesyjne',
  customTable: 'Wybierz dowolna tabele uzytkownika',
};

interface SessionInspirationsPanelProps {
  sessionId: string;
  currentLocationId: string | null;
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  defaultOpenLabel?: string;
}

function CollapsibleSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
  defaultOpenLabel = 'Rozwin',
}: CollapsibleSectionProps) {
  return (
    <div className="app-panel rounded-[1.35rem] p-3.5">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span className="text-surface-800 text-sm font-semibold">{title}</span>
        {subtitle ? <span className="text-surface-500 text-xs">{subtitle}</span> : null}
        <span className="ml-auto text-surface-500 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(86,93,94,0.16)] bg-[rgba(223,225,218,0.85)] transition-colors group-hover:text-primary-700">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open ? <div className="mt-3 border-t border-[rgba(86,93,94,0.1)] pt-3">{children}</div> : null}
      {!open ? <p className="text-surface-500 mt-2 text-xs">{defaultOpenLabel} sekcje</p> : null}
    </div>
  );
}

export function SessionInspirationsPanel({ sessionId, currentLocationId }: SessionInspirationsPanelProps) {
  const navigate = useNavigate();
  const { db, campaignId } = useCampaign();
  const settingsKeys = useMemo(
    () => ({
      favoriteTableIds: generatorSettingsKeys.favoriteTableIds(campaignId),
      autoSaveHistory: generatorSettingsKeys.autoSaveHistory(campaignId),
      tagInput: generatorSettingsKeys.tagInput(campaignId),
      seed: generatorSettingsKeys.seed(campaignId),
      onboardingDismissed: generatorSettingsKeys.onboardingDismissed(campaignId),
    }),
    [campaignId],
  );
  const [customSearch, setCustomSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteTableIds, setFavoriteTableIds] = useState<string[]>(() => {
    return [];
  });
  const [placeOnSceneNow, setPlaceOnSceneNow] = useState(true);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [autoSaveHistory, setAutoSaveHistory] = useState<boolean>(true);
  const [tagInput, setTagInput] = useState<string>('improv');
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'ux' | 'quality' | 'speed' | 'other'>('ux');
  const [feedbackRating, setFeedbackRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { activePack, filteredCustomTables, getTableById, isBootstrapping, bootstrapDefaultPack } =
    useGeneratorPacks({
      customSearch,
      tagFilter,
      favoritesOnly,
      favoriteTableIds,
    });
  const {
    mode,
    setMode,
    customTableId,
    setCustomTableId,
    seed,
    setSeed,
    withoutRepetition,
    setWithoutRepetition,
    evoEnabled,
    setEvoEnabled,
    setEvoContextTags,
    isCommitting,
    lastRoll,
    rollHistory,
    roll,
    preview,
    rollAgain,
    modeIconName,
  } = useGeneratorRoll({
    activePack,
    onCommit: autoSaveHistory
      ? async (rollResult) => {
          await appendGeneratorRollLog(db, {
            campaignId,
            sessionId,
            packId: rollResult.packId,
            kind: rollResult.kind,
            resultText: rollResult.resultText,
            sourceTableIds: rollResult.sourceTableIds,
          });
        }
      : undefined,
  });
  const previewRoll = useMemo(() => preview(), [preview]);
  const sessionContextTags = useLiveQuery(async () => {
    const appears = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((relation) => relation.type === 'appears_in')
      .toArray();
    if (appears.length === 0) return [];
    const entityIds = Array.from(new Set(appears.map((relation) => relation.sourceId)));
    const entities = await db.entities.where('id').anyOf(entityIds).toArray();
    const tags = new Set<string>();
    for (const entity of entities) {
      tags.add(entity.type);
      for (const tag of entity.tags ?? []) {
        const normalized = tag.trim().toLowerCase();
        if (normalized) tags.add(normalized);
      }
      for (const token of entity.name.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
        if (token.length >= 3) tags.add(token);
      }
    }
    return Array.from(tags).slice(0, 64);
  }, [db, sessionId]);

  useEffect(() => {
    const migrated = migrateLegacyGeneratorSettings(campaignId);
    if (migrated) {
      toast.info('Zmigrowano stare ustawienia generatora do biezacej kampanii.');
    }
    try {
      const parsedFavorites = JSON.parse(localStorage.getItem(settingsKeys.favoriteTableIds) ?? '[]');
      setFavoriteTableIds(Array.isArray(parsedFavorites) ? parsedFavorites.filter((item) => typeof item === 'string') : []);
    } catch {
      setFavoriteTableIds([]);
    }
    setAutoSaveHistory(localStorage.getItem(settingsKeys.autoSaveHistory) !== 'false');
    const storedTagInput = localStorage.getItem(settingsKeys.tagInput);
    if (storedTagInput !== null) {
      setTagInput(storedTagInput);
    }
    const storedSeed = localStorage.getItem(settingsKeys.seed);
    if (storedSeed !== null) {
      setSeed(storedSeed);
    }
    setOnboardingVisible(localStorage.getItem(settingsKeys.onboardingDismissed) !== '1');
    // setSeed is intentionally omitted: its identity can change between renders and
    // would retrigger this migration/init effect unexpectedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, settingsKeys]);

  useEffect(() => {
    localStorage.setItem(settingsKeys.favoriteTableIds, JSON.stringify(favoriteTableIds));
  }, [favoriteTableIds, settingsKeys]);

  useEffect(() => {
    localStorage.setItem(settingsKeys.autoSaveHistory, autoSaveHistory ? 'true' : 'false');
  }, [autoSaveHistory, settingsKeys]);

  useEffect(() => {
    localStorage.setItem(settingsKeys.tagInput, tagInput);
  }, [tagInput, settingsKeys]);

  useEffect(() => {
    localStorage.setItem(settingsKeys.seed, seed);
  }, [seed, settingsKeys]);

  useEffect(() => {
    setEvoContextTags(sessionContextTags ?? []);
  }, [sessionContextTags, setEvoContextTags]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return;
        if (event.target.isContentEditable) return;
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        roll();
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        rollAgain();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [roll, rollAgain]);

  const modeIcon = useMemo(() => {
    if (modeIconName === 'character') return <User className="h-3.5 w-3.5" />;
    if (modeIconName === 'location') return <MapPin className="h-3.5 w-3.5" />;
    if (modeIconName === 'eventTable') return <Dice5 className="h-3.5 w-3.5" />;
    return <Table2 className="h-3.5 w-3.5" />;
  }, [modeIconName]);

  function parseTags(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleCopyResult() {
    if (!lastRoll) {
      toast.error('Brak wyniku do skopiowania');
      return;
    }
    try {
      await navigator.clipboard.writeText(lastRoll.resultText);
      toast.success('Wynik skopiowany');
    } catch {
      toast.error('Nie udalo sie skopiowac wyniku');
    }
  }

  async function handleAddResultToSessionNotes() {
    if (!lastRoll) {
      toast.error('Brak wyniku do zapisania');
      return;
    }
    try {
      await createSessionNoteFromRoll({ db, sessionId, roll: lastRoll, tags: parseTags(tagInput) });
      trackGeneratorEvent({
        name: 'generator_result_conversion',
        fromKind: lastRoll.kind,
        to: 'note',
        entityType: 'note',
      });
      toast.success('Dodano wynik do notatek sesji');
    } catch {
      toast.error('Nie udalo sie dodac notatki');
    }
  }

  async function handleCreateEntityFromRoll() {
    if (!lastRoll) {
      toast.error('Brak wyniku do utworzenia encji');
      return;
    }
    try {
      if (lastRoll.kind === 'character') {
        const npc = await createNpcFromRoll({
          db,
          sessionId,
          roll: lastRoll,
          currentLocationId,
          placeOnSceneNow,
          saveAsDraft,
          tags: parseTags(tagInput),
        });
        trackGeneratorEvent({
          name: 'generator_result_conversion',
          fromKind: lastRoll.kind,
          to: 'entity',
          entityType: 'npc',
        });
        toast.success(`Utworzono NPC: ${npc.name}`);
        return;
      }
      if (lastRoll.kind === 'location') {
        const location = await createLocationFromRoll({
          db,
          sessionId,
          roll: lastRoll,
          saveAsDraft,
          tags: parseTags(tagInput),
        });
        trackGeneratorEvent({
          name: 'generator_result_conversion',
          fromKind: lastRoll.kind,
          to: 'entity',
          entityType: 'location',
        });
        toast.success(`Utworzono lokacje: ${location.name}`);
        return;
      }
      await createSessionNoteFromRoll({ db, sessionId, roll: lastRoll, tags: parseTags(tagInput) });
      trackGeneratorEvent({
        name: 'generator_result_conversion',
        fromKind: lastRoll.kind,
        to: 'note',
        entityType: 'note',
      });
      toast.success('Wynik zapisany jako notatka sesji');
    } catch {
      toast.error('Nie udalo sie utworzyc encji z wyniku');
    }
  }

  function handleQuickPreset(preset: 3 | 5, presetMode: 'character' | 'location') {
    for (let i = 0; i < preset; i += 1) {
      roll(presetMode);
    }
  }

  function toggleFavoriteTable(tableId: string) {
    setFavoriteTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId],
    );
  }

  function handleSubmitFeedback() {
    const message = feedbackMessage.trim();
    if (message.length < 5) {
      toast.error('Wpisz dluzszy feedback. Minimum 5 znakow.');
      return;
    }
    submitGeneratorFeedback({
      id: generateId(),
      createdAt: nowISO(),
      sessionId,
      category: feedbackCategory,
      rating: feedbackRating,
      message,
    });
    trackGeneratorEvent({
      name: 'generator_feedback_submitted',
      sessionId,
      category: feedbackCategory,
      rating: feedbackRating,
    });
    setFeedbackMessage('');
    toast.success('Dzieki! Feedback zapisany.');
  }

  return (
    <div className="flex flex-col gap-4">
      {onboardingVisible && (
        <div className="app-panel rounded-[1.35rem] border border-[rgba(33,71,102,0.2)] bg-[rgba(227,236,239,0.72)] p-3.5">
          <p className="text-surface-800 text-sm font-semibold">Pierwsze uruchomienie Inspiracji</p>
          <p className="text-surface-700 mt-1 text-xs">
            Zacznij od trybu i kliknij <strong>Losuj</strong>. Potem zapisz wynik jako notatke albo encje.
            Skroty: <strong>R</strong> (losuj) i <strong>Q</strong> (losuj ponownie).
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(settingsKeys.onboardingDismissed, '1');
              setOnboardingVisible(false);
            }}
            className="app-button-secondary mt-3 rounded-xl px-3 py-1.5 text-[11px] font-medium"
          >
            Rozumiem
          </button>
        </div>
      )}

      <div className="app-panel rounded-[1.45rem] p-4">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">Inspiracje</p>
            <p className="text-surface-700 mt-1 text-sm">
              Szybkie podpowiedzi do improwizacji: postacie, lokacje, zdarzenia i tabele wlasne.
            </p>
          </div>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200 ring-inset">
            Historia: {rollHistory.length}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            [
              ['character', MODE_LABELS.character],
              ['location', MODE_LABELS.location],
              ['eventTable', MODE_LABELS.eventTable],
              ['customTable', MODE_LABELS.customTable],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              title={`Tryb losowania: ${label}`}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                mode === value ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(229,231,223,0.98)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="app-input-shell rounded-[1rem] px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-primary-700 inline-flex items-center gap-1 rounded-full border border-[rgba(33,71,102,0.18)] bg-[rgba(111,146,164,0.12)] px-2.5 py-1 text-[11px] font-semibold">
              {modeIcon}
              {MODE_LABELS[mode]}
            </span>
            <span className="text-surface-500 text-xs">{MODE_HINTS[mode]}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => roll()}
              disabled={!activePack}
              className="app-button-primary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              Losuj
            </button>
            <button
              type="button"
              onClick={rollAgain}
              disabled={!activePack}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Losuj ponownie
              </span>
            </button>
          </div>
          {previewRoll && <p className="text-surface-500 mt-2 text-xs">Podglad: {previewRoll.resultText}</p>}
          {isCommitting && <p className="text-surface-500 mt-1 text-xs">Zapisywanie historii...</p>}
        </div>
      </div>

      {!activePack && (
        <div className="app-panel rounded-[1.35rem] p-3.5">
          <p className="text-surface-700 text-sm">
            Brak zestawu generatora dla tej kampanii. Przygotuj domyslny zestaw, aby uruchomic losowanie.
          </p>
          <button
            type="button"
            onClick={() => void bootstrapDefaultPack()}
            disabled={isBootstrapping}
            className="app-button-primary mt-3 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {isBootstrapping ? 'Przygotowywanie...' : 'Przygotuj domyslny zestaw'}
          </button>
        </div>
      )}

      {lastRoll ? (
        <div className="app-panel rounded-[1.35rem] p-3.5">
          <p className="text-surface-500 mb-1 text-[11px] font-semibold tracking-[0.14em] uppercase">Wynik</p>
          <p className="text-primary-900 text-sm font-semibold">{lastRoll.resultText}</p>
          {lastRoll.sourceTableIds.length > 0 && (
            <p className="text-surface-500 mt-1 text-xs">
              Zrodlo: {lastRoll.sourceTableIds.map((id) => getTableById(id)?.name ?? id).join(', ')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyResult()}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Kopiuj wynik
            </button>
            <button
              type="button"
              onClick={() => void handleAddResultToSessionNotes()}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Dodaj do notatki sesji
            </button>
            <button
              type="button"
              onClick={() => void handleCreateEntityFromRoll()}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Utworz encje z wyniku
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Otworz ustawienia generatora
            </button>
          </div>
        </div>
      ) : (
        <div className="app-input-shell rounded-[1.25rem] border-dashed px-4 py-4 text-sm text-surface-600">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
            <p>Kliknij "Losuj", aby wygenerowac pierwsza inspiracje.</p>
          </div>
        </div>
      )}

      <CollapsibleSection
        title="Ustawienia zaawansowane"
        subtitle="Rzadziej zmieniane opcje generatora"
        open={advancedOpen || mode === 'customTable'}
        onToggle={() => setAdvancedOpen((prev) => !prev)}
      >
        {mode === 'customTable' && (
          <div className="mb-3 space-y-2.5 rounded-[0.95rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.64)] p-2.5">
            <label className="text-surface-500 block text-[11px] font-semibold uppercase tracking-[0.14em]">
              Szukaj tabeli
            </label>
            <input
              value={customSearch}
              onChange={(event) => setCustomSearch(event.target.value)}
              placeholder="np. plot twist, plotka, loot..."
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="Filtr tagu, np. miasto, walka..."
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <label className="inline-flex items-center gap-2 text-xs text-surface-700">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(event) => setFavoritesOnly(event.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
              />
              Tylko ulubione
            </label>
            <select
              value={customTableId}
              onChange={(event) => setCustomTableId(event.target.value)}
              className="app-input w-full rounded-xl px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Wybierz tabele...</option>
              {filteredCustomTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
            {filteredCustomTables.length === 0 && <p className="text-surface-500 text-xs">Brak pasujacych tabel.</p>}
            {customTableId && (
              <button
                type="button"
                onClick={() => toggleFavoriteTable(customTableId)}
                className="app-button-secondary rounded-xl px-3 py-1.5 text-[11px] font-medium"
              >
                {favoriteTableIds.includes(customTableId) ? 'Odepnij ulubiona tabele' : 'Przypnij do ulubionych'}
              </button>
            )}
          </div>
        )}
        <div className="space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleQuickPreset(3, 'character')}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
              title="Szybki preset: losuj postac 3 razy"
            >
              Szybki preset: 3x Postac
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(5, 'location')}
              className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
              title="Szybki preset: losuj lokacje 5 razy"
            >
              Szybki preset: 5x Lokacja
            </button>
          </div>
          <div>
            <label className="text-surface-500 mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em]">
              Seed (opcjonalnie)
            </label>
            <input
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="np. sesja-12"
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-surface-700">
            <input
              type="checkbox"
              checked={withoutRepetition}
              onChange={(event) => setWithoutRepetition(event.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
            />
            Bez powtorzen (w aktywnym losowaniu)
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-surface-700">
            <input
              type="checkbox"
              checked={evoEnabled}
              onChange={(event) => setEvoEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
            />
            EvoGenerator (dopasowanie do kontekstu kampanii)
          </label>
          {mode === 'character' && (
            <label className="inline-flex items-center gap-2 text-xs text-surface-700">
              <input
                type="checkbox"
                checked={placeOnSceneNow}
                onChange={(event) => setPlaceOnSceneNow(event.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
              />
              Wstaw do sceny teraz
            </label>
          )}
          {(mode === 'character' || mode === 'location') && (
            <label className="inline-flex items-center gap-2 text-xs text-surface-700">
              <input
                type="checkbox"
                checked={saveAsDraft}
                onChange={(event) => setSaveAsDraft(event.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
              />
              Zapisz jako szkic encji
            </label>
          )}
          <div>
            <label className="text-surface-500 mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em]">
              Tagi wyniku
            </label>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="np. improv, scena-1"
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-surface-700">
            <input
              type="checkbox"
              checked={autoSaveHistory}
              onChange={(event) => setAutoSaveHistory(event.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
            />
            Auto-zapis do historii
          </label>
        </div>
      </CollapsibleSection>

      {rollHistory.length > 0 && (
        <CollapsibleSection
          title="Historia losowan"
          subtitle={`${rollHistory.length} ostatnich wpisow`}
          open={historyOpen}
          onToggle={() => setHistoryOpen((prev) => !prev)}
        >
          <div className="flex flex-col gap-1.5">
            {rollHistory.map((item) => (
              <div key={item.id} className="app-input-shell rounded-[0.9rem] px-3 py-2 text-xs text-surface-700">
                {item.resultText}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Feedback o inspiracjach"
        subtitle="Pomoz ulepszyc generator"
        open={feedbackOpen}
        onToggle={() => setFeedbackOpen((prev) => !prev)}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={feedbackCategory}
            onChange={(event) => setFeedbackCategory(event.target.value as 'ux' | 'quality' | 'speed' | 'other')}
            className="app-input rounded-xl px-3 py-2 text-xs"
          >
            <option value="ux">UX</option>
            <option value="quality">Jakosc wynikow</option>
            <option value="speed">Szybkosc</option>
            <option value="other">Inne</option>
          </select>
          <select
            value={feedbackRating}
            onChange={(event) => setFeedbackRating(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="app-input rounded-xl px-3 py-2 text-xs"
          >
            <option value={1}>1/5</option>
            <option value={2}>2/5</option>
            <option value={3}>3/5</option>
            <option value={4}>4/5</option>
            <option value={5}>5/5</option>
          </select>
        </div>
        <textarea
          value={feedbackMessage}
          onChange={(event) => setFeedbackMessage(event.target.value)}
          placeholder="Co najbardziej przeszkadza w panelu Inspiracje?"
          className="app-input mt-2 min-h-20 w-full rounded-xl px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={handleSubmitFeedback}
          className="app-button-secondary mt-2 rounded-xl px-3 py-2 text-xs font-medium"
        >
          Wyslij feedback
        </button>
      </CollapsibleSection>
    </div>
  );
}

