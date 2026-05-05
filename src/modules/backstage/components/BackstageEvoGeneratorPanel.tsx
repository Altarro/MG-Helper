import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkles, Dices, RefreshCcw, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCampaign } from '@shared/db/CampaignContext';
import { useGeneratorPacks } from '@modules/generator/hooks/useGeneratorPacks';
import { useGeneratorRoll, type InspirationMode } from '@modules/generator/hooks/useGeneratorRoll';
import { appendGeneratorRollLog } from '@modules/generator/repository';
import { isSession } from '@modules/sessions/types';

const MODE_LABELS: Record<InspirationMode, string> = {
  character: 'NPC',
  location: 'Lokacja',
  eventTable: 'Zdarzenie',
  customTable: 'Tabela własna',
};

export function BackstageEvoGeneratorPanel() {
  const { db, campaignId } = useCampaign();
  const { activePack, filteredCustomTables, getTableById, isBootstrapping, bootstrapDefaultPack } = useGeneratorPacks();
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
    roll,
    rollAgain,
    preview,
    lastRoll,
    rollHistory,
    clearRollHistory,
  } = useGeneratorRoll({
    activePack,
    onCommit: async (result) => {
      await appendGeneratorRollLog(db, {
        campaignId,
        sessionId: null,
        packId: result.packId,
        kind: result.kind,
        resultText: result.resultText,
        sourceTableIds: result.sourceTableIds,
      });
    },
  });

  const contextTags = useLiveQuery(async () => {
    const sessions = (await db.entities
      .where('type')
      .equals('session')
      .toArray()).filter(isSession);
    const recentSessionIds = sessions
      .sort((a, b) => (b.data.number ?? 0) - (a.data.number ?? 0))
      .slice(0, 3)
      .map((s) => s.id);
    if (recentSessionIds.length === 0) return [];

    const appears = await db.relations
      .where('type')
      .equals('appears_in')
      .toArray();
    const sourceIds = appears.filter((relation) => recentSessionIds.includes(relation.targetId)).map((relation) => relation.sourceId);
    if (sourceIds.length === 0) return [];
    const entities = await db.entities.where('id').anyOf(Array.from(new Set(sourceIds))).toArray();

    const tags = new Set<string>();
    for (const entity of entities) {
      tags.add(entity.type);
      for (const tag of entity.tags ?? []) {
        const normalized = tag.trim().toLowerCase();
        if (normalized) tags.add(normalized);
      }
      for (const token of entity.name.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
        if (token.length >= 4) tags.add(token);
      }
    }
    return Array.from(tags).slice(0, 48);
  }, [db, campaignId]);

  useEffect(() => {
    setEvoContextTags(contextTags ?? []);
  }, [contextTags, setEvoContextTags]);

  const previewRoll = useMemo(() => preview(), [preview]);

  function handleRoll() {
    if (mode === 'customTable' && !customTableId) {
      toast.error('Wybierz tabelę własną.');
      return;
    }
    roll(mode, customTableId);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
      <section className="app-panel rounded-[1.35rem] p-4 lg:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-surface-500 text-[11px] font-semibold uppercase tracking-[0.14em]">Silnik inspiracji</p>
          <span className="rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-surface-600">
            Kontekst: {(contextTags ?? []).length} tagów
          </span>
        </div>
        {!activePack ? (
          <div className="rounded-xl border border-dashed border-surface-300 bg-white p-4 text-sm text-surface-600">
            <p>Brak aktywnego zestawu generatora dla kampanii.</p>
            <button
              type="button"
              onClick={() => void bootstrapDefaultPack()}
              disabled={isBootstrapping}
              className="app-button-primary mt-3 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {isBootstrapping ? 'Przygotowywanie...' : 'Utwórz domyślny zestaw'}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {(Object.keys(MODE_LABELS) as InspirationMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    mode === value ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.9)]'
                  }`}
                >
                  {MODE_LABELS[value]}
                </button>
              ))}
            </div>
            {mode === 'customTable' ? (
              <select
                value={customTableId}
                onChange={(event) => setCustomTableId(event.target.value)}
                className="app-input mb-3 w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Wybierz tabelę własną...</option>
                {filteredCustomTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-surface-500 text-[11px] font-semibold uppercase tracking-[0.14em]">
                Seed
                <input
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                  placeholder="np. sesja-18"
                  className="app-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <div className="rounded-xl border border-surface-200 bg-white px-3 py-2">
                <p className="text-surface-500 text-[11px] font-semibold uppercase tracking-[0.14em]">Tryb</p>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-surface-700">
                  <input
                    type="checkbox"
                    checked={evoEnabled}
                    onChange={(event) => setEvoEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
                  />
                  EvoGenerator (dopasowanie do kampanii)
                </label>
                <label className="mt-1 inline-flex items-center gap-2 text-xs text-surface-700">
                  <input
                    type="checkbox"
                    checked={withoutRepetition}
                    onChange={(event) => setWithoutRepetition(event.target.checked)}
                    className="h-4 w-4 rounded border-surface-300 text-primary-700 focus:ring-primary-500/30"
                  />
                  Bez powtórzeń
                </label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRoll}
                className="app-button-primary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <WandSparkles className="h-3.5 w-3.5" />
                Losuj inspirację
              </button>
              <button
                type="button"
                onClick={rollAgain}
                className="app-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Losuj ponownie
              </button>
            </div>
            {previewRoll ? (
              <p className="text-surface-500 mt-2 text-xs">
                Podgląd: <span className="font-medium text-surface-700">{previewRoll.resultText}</span>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="app-panel rounded-[1.35rem] p-4 lg:p-5">
        <p className="text-surface-500 text-[11px] font-semibold uppercase tracking-[0.14em]">Wyniki i historia</p>
        {lastRoll ? (
          <div className="mt-2 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">
              Ostatnia inspiracja
            </p>
            <p className="mt-1 text-sm font-semibold text-surface-900">{lastRoll.resultText}</p>
            {lastRoll.sourceTableIds.length > 0 ? (
              <p className="mt-1 text-xs text-surface-600">
                Źródło: {lastRoll.sourceTableIds.map((id) => getTableById(id)?.name ?? id).join(', ')}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-dashed border-surface-300 bg-white p-3 text-xs text-surface-600">
            Użyj przycisku „Losuj inspirację”, aby przygotować pomysły przed sesją.
          </div>
        )}
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-surface-700">Ostatnie losowania</p>
            <button
              type="button"
              onClick={clearRollHistory}
              className="rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-medium text-surface-600 hover:bg-surface-50"
            >
              Wyczyść
            </button>
          </div>
          <div className="space-y-1.5">
            {rollHistory.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-surface-700">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-surface-500">
                  <Dices className="h-3.5 w-3.5" /> {MODE_LABELS[item.kind]}
                </span>
                <p className="mt-0.5">{item.resultText}</p>
              </div>
            ))}
            {rollHistory.length === 0 ? (
              <p className="text-xs text-surface-500">Historia jest pusta.</p>
            ) : null}
          </div>
          {evoEnabled ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900">
              <p className="inline-flex items-center gap-1 font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Evo aktywny
              </p>
              <p className="mt-0.5 text-emerald-800/90">
                Generator bierze pod uwagę kontekst ostatnich sesji i wcześniejsze wyniki losowań.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

