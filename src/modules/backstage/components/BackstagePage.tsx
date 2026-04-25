import { useState } from 'react';
import { Theater } from 'lucide-react';
import { useBackstage } from '../hooks/useBackstage';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ThreadSessionMatrix } from './ThreadSessionMatrix';
import { ThreatRadarPanel } from './ThreatRadarPanel';
import { BackstageSummaryPanel } from './BackstageSummaryPanel';
import { BackstageHintsPanel } from './BackstageHintsPanel';

type TabId = 'radar' | 'matrix';

export function BackstagePage() {
  const data = useBackstage();
  const [tab, setTab] = useState<TabId>('radar');

  if (data === undefined) return <LoadingSpinner />;

  const { sessions, threads, threadSessionIds, threatRows } = data;

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
          Wątki × sesje
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
        <section aria-labelledby="matrix-heading" className="min-h-0 space-y-3">
          <h2 id="matrix-heading" className="text-sm font-semibold text-surface-800">
            Wątki × sesje
          </h2>
          <ThreadSessionMatrix sessions={sessions} threads={threads} threadSessionIds={threadSessionIds} />
        </section>
      )}
    </div>
  );
}
