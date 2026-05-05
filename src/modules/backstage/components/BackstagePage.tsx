import { useEffect, useState, type KeyboardEvent } from 'react';
import { ArrowUp, GitFork, Radar, Sparkles, Table2, Theater } from 'lucide-react';
import { scrollWindowToElementId } from '@shared/utils/scrollToAnchor';
import { useBackstage } from '../hooks/useBackstage';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ThreadSessionMatrix } from './ThreadSessionMatrix';
import { NpcSessionMatrix } from './NpcSessionMatrix';
import { ThreatSessionMatrix } from './ThreatSessionMatrix';
import { LocationSessionMatrix } from './LocationSessionMatrix';
import { ClueSessionMatrix, type ClueMatrixFilter } from './ClueSessionMatrix';
import { ThreatRadarPanel } from './ThreatRadarPanel';
import { BackstageSummaryPanel } from './BackstageSummaryPanel';
import { BackstageHintsPanel } from './BackstageHintsPanel';
import { GraphPage } from '@modules/graph/components/GraphPage';
import { BackstageEvoGeneratorPanel } from './BackstageEvoGeneratorPanel';

type TabId = 'radar' | 'matrix' | 'graph' | 'evo';

export function BackstagePage() {
  const data = useBackstage();
  const [tab, setTab] = useState<TabId>('radar');
  const [clueFilter, setClueFilter] = useState<ClueMatrixFilter>('all');
  const [showFloatingTop, setShowFloatingTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowFloatingTop(window.scrollY > 340);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (data === undefined) return <LoadingSpinner />;

  const {
    sessions,
    threads,
    threadSessionIds,
    npcs,
    npcSessionIds,
    threats,
    threatSessionIds,
    locations,
    locationSessionIds,
    clues,
    clueSessionIds,
    threatRows,
  } = data;
  const openThreadsCount = threads.filter((thread) => thread.data.status !== 'completed').length;
  const activeThreatsCount = threats.filter((threat) => threat.data.status !== 'completed').length;
  const tabMeta: Array<{ id: TabId; label: string; icon: typeof Radar }> = [
    { id: 'radar', label: 'Radar zagrożeń', icon: Radar },
    { id: 'matrix', label: 'Macierz sesji', icon: Table2 },
    { id: 'graph', label: 'Graf relacji', icon: GitFork },
    { id: 'evo', label: 'EvoGenerator', icon: Sparkles },
  ];
  const topThreatActions = threatRows
    .filter((row) => row.tier >= 3 || row.isSpotlightSuggestion)
    .slice(0, 3)
    .map((row) => ({
      id: row.threatId,
      label: `Przejdź do: ${row.name}`,
      href: `/threats/${row.threatId}`,
    }));

  function scrollToMatrixSection(sectionId: string) {
    scrollWindowToElementId(sectionId, 10);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabMeta.findIndex((item) => item.id === tab);
    if (event.key === 'Home') {
      setTab(tabMeta[0]!.id);
      return;
    }
    if (event.key === 'End') {
      setTab(tabMeta[tabMeta.length - 1]!.id);
      return;
    }
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + delta + tabMeta.length) % tabMeta.length;
    setTab(tabMeta[next]!.id);
  }

  return (
    <div className="flex min-h-0 flex-col gap-6 p-6" data-testid="backstage-page">
      <section className="app-panel-strong shrink-0 rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="text-primary-700 mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
          <Theater className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Prowadzenie
        </div>
        <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">Za kulisami</h1>
        <p className="text-surface-700 mt-2 max-w-[62ch] text-sm leading-7 lg:text-[0.98rem]">
          Miejsce do spokojnej odprawy przed sesją. Widzisz tu, co naprawdę wymaga Twojej decyzji, a co może jeszcze
          poczekać.
        </p>
      </section>

      <BackstageSummaryPanel
        stats={{
          activeThreats: activeThreatsCount,
          openThreads: openThreadsCount,
          sessionCount: sessions.length,
          clueCount: clues.length,
        }}
        actions={[
          ...topThreatActions,
          { id: 'backstage-graph', label: 'Otwórz graf relacji', href: '/graph' },
        ]}
      />
      <BackstageHintsPanel />

      <div
        className="flex flex-wrap gap-1 rounded-xl border border-surface-200 bg-surface-100/80 p-1 text-sm shrink-0"
        role="tablist"
        aria-label="Widok za kulisami"
        onKeyDown={handleTabsKeyDown}
      >
        {tabMeta.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`backstage-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`backstage-panel-${id}`}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
              tab === id ? 'bg-white text-primary-800 shadow-sm' : 'text-surface-600 hover:text-surface-900'
            }`}
            onClick={() => setTab(id)}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'radar' && (
        <section
          id="backstage-panel-radar"
          role="tabpanel"
          aria-labelledby="backstage-tab-radar"
          className="min-h-0 space-y-3"
        >
          <h2 id="radar-heading" className="text-sm font-semibold text-surface-800">
            Radar zagrożeń
          </h2>
          <p className="text-xs text-surface-500">
            Traktuj to jak briefing: wyżej są sprawy pilniejsze, niżej te spokojniejsze. Kliknij zagrożenie, żeby od
            razu przejść do decyzji.
          </p>
          <ThreatRadarPanel rows={threatRows} />
        </section>
      )}

      {tab === 'matrix' && (
        <section
          id="backstage-panel-matrix"
          role="tabpanel"
          aria-labelledby="backstage-tab-matrix"
          className="min-h-0 space-y-8"
        >
          <div id="matrix-heading" className="-mt-2.5 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ['matrix-threads', 'WĄTKI × SESJE'],
                ['matrix-characters', 'POSTACIE × SESJE'],
                ['matrix-threats', 'ZAGROŻENIA × SESJE'],
                ['matrix-locations', 'LOKACJE × SESJE'],
                ['matrix-clues', 'WSKAZÓWKI × SESJE'],
              ] as const).map(([sectionId, label]) => (
                <button
                  key={sectionId}
                  type="button"
                  onClick={() => scrollToMatrixSection(sectionId)}
                  className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-surface-700 transition-colors hover:bg-surface-50 hover:text-surface-900"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div id="matrix-threads" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">Wątki × Sesje</h3>
            <ThreadSessionMatrix sessions={sessions} threads={threads} threadSessionIds={threadSessionIds} />
          </div>

          <div id="matrix-characters" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">POSTACIE × SESJE</h3>
            <NpcSessionMatrix sessions={sessions} npcs={npcs} npcSessionIds={npcSessionIds} />
          </div>

          <div id="matrix-threats" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">ZAGROŻENIA × SESJE</h3>
            <ThreatSessionMatrix sessions={sessions} threats={threats} threatSessionIds={threatSessionIds} />
          </div>

          <div id="matrix-locations" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">LOKACJE × SESJE</h3>
            <LocationSessionMatrix sessions={sessions} locations={locations} locationSessionIds={locationSessionIds} />
          </div>

          <div id="matrix-clues" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">WSKAZÓWKI × SESJE</h3>
              <div className="flex items-center gap-1 rounded-full border border-surface-200 bg-surface-50 p-1">
                {([
                  ['all', 'Wszystkie'],
                  ['discovered', 'Odkryte'],
                  ['undiscovered', 'Nieodkryte'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setClueFilter(value)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      clueFilter === value
                        ? 'bg-white text-primary-800 shadow-sm'
                        : 'text-surface-600 hover:text-surface-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ClueSessionMatrix
              sessions={sessions}
              clues={clues}
              clueSessionIds={clueSessionIds}
              filter={clueFilter}
            />
          </div>
        </section>
      )}
      {tab === 'graph' && (
        <section
          id="backstage-panel-graph"
          role="tabpanel"
          aria-labelledby="backstage-tab-graph"
          className="min-h-0 space-y-3"
        >
          <h2 id="graph-heading" className="text-sm font-semibold text-surface-800">
            Graf relacji
          </h2>
          <p className="text-xs text-surface-500">
            Wizualny podgląd połączeń między encjami. Użyj gotowych widoków, żeby szybko przełączyć perspektywę.
          </p>
          <GraphPage embedded />
        </section>
      )}
      {tab === 'evo' && (
        <section
          id="backstage-panel-evo"
          role="tabpanel"
          aria-labelledby="backstage-tab-evo"
          className="min-h-0 space-y-3"
        >
          <h2 id="evo-heading" className="text-sm font-semibold text-surface-800">
            EvoGenerator
          </h2>
          <p className="text-xs text-surface-500">
            Generator inspiracji przed sesją: NPC, lokacje, zdarzenia i własne tabele z dopasowaniem do kontekstu
            kampanii.
          </p>
          <BackstageEvoGeneratorPanel />
        </section>
      )}
      {tab === 'matrix' && showFloatingTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          title="Powrót na górę"
          aria-label="Powrót na górę"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
