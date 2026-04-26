import { useEffect, useState } from 'react';
import { ArrowUp, Theater } from 'lucide-react';
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

type TabId = 'radar' | 'matrix';

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

  function scrollToMatrixSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const targetTop = window.scrollY + el.getBoundingClientRect().top - 10;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-0" data-testid="backstage-page">
      <header className="shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <Theater className="h-6 w-6 text-primary-600 shrink-0" aria-hidden />
          <h1 className="text-xl font-semibold text-surface-900">Za kulisami</h1>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-surface-600">
          Spokojna odprawa przed sesją: co wymaga decyzji narratora, a co może poczekać. Radar patrzy tylko na to, co
          już zapisałeś w kampanii — bez zgadywania spoza bazy.
        </p>
      </header>

      <BackstageSummaryPanel />
      <BackstageHintsPanel />

      <div
        className="flex gap-1 rounded-xl border border-surface-200 bg-surface-100/80 p-1 text-sm shrink-0"
        role="tablist"
        aria-label="Widok za kulisami"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'radar'}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            tab === 'radar' ? 'bg-white text-primary-800 shadow-sm' : 'text-surface-600 hover:text-surface-900'
          }`}
          onClick={() => setTab('radar')}
        >
          Radar zagrożeń
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'matrix'}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            tab === 'matrix' ? 'bg-white text-primary-800 shadow-sm' : 'text-surface-600 hover:text-surface-900'
          }`}
          onClick={() => setTab('matrix')}
        >
          Macierz sesji
        </button>
      </div>

      {tab === 'radar' && (
        <section aria-labelledby="radar-heading" className="min-h-0 space-y-3">
          <h2 id="radar-heading" className="text-sm font-semibold text-surface-800">
            Radar zagrożeń
          </h2>
          <p className="text-xs text-surface-500">
            Kolory i kolejność to podpowiedź pilności (pięć stopni). Obecność = jak bardzo zagrożenie „żyje” na stole;
            dług = napięcie między wskazówkami a wątkami.
          </p>
          <ThreatRadarPanel rows={threatRows} />
        </section>
      )}

      {tab === 'matrix' && (
        <section aria-labelledby="matrix-heading" className="min-h-0 space-y-8">
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
                  className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-surface-700 hover:bg-surface-50 hover:text-surface-900"
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
      {tab === 'matrix' && showFloatingTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white/70 text-surface-700 shadow-sm backdrop-blur-sm transition-opacity duration-200 opacity-55 hover:opacity-100"
          title="Powrót na górę"
          aria-label="Powrót na górę"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
