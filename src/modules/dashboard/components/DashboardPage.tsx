import { Clock3, History, Shield, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { useDashboard } from '../hooks/useDashboard';
import { ActiveFronts } from './ActiveFronts';
import { RunningClocks } from './RunningClocks';
import { RecentChanges } from './RecentChanges';

export function DashboardPage() {
  const data = useDashboard();

  if (!data) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-primary-700 mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Puls kampanii
            </div>
            <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">
              Dashboard
            </h1>
            <p className="text-surface-700 mt-2 max-w-[62ch] text-sm leading-7 lg:text-[0.98rem]">
              Szybki przegląd aktywnej presji, bieżących frontów i ostatnich zmian w kampanii.
            </p>
          </div>

          <div className="grid min-w-[260px] flex-1 gap-3 sm:grid-cols-3">
            <div className="app-panel rounded-[1.35rem] px-4 py-4">
              <div className="text-surface-500 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                <Shield className="text-primary-600 h-3.5 w-3.5" />
                Fronty
              </div>
              <p className="text-primary-900 mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {data.activeFronts.length}
              </p>
              <p className="text-surface-600 mt-1 text-xs">Aktywne osie konfliktu</p>
            </div>

            <div className="app-panel rounded-[1.35rem] px-4 py-4">
              <div className="text-surface-500 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                <Clock3 className="text-primary-600 h-3.5 w-3.5" />
                Zegary
              </div>
              <p className="text-primary-900 mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {data.runningClocks.length}
              </p>
              <p className="text-surface-600 mt-1 text-xs">Presje nadal w ruchu</p>
            </div>

            <div className="app-panel rounded-[1.35rem] px-4 py-4">
              <div className="text-surface-500 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                <History className="text-primary-600 h-3.5 w-3.5" />
                Zmiany
              </div>
              <p className="text-primary-900 mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {data.recentEntities.length}
              </p>
              <p className="text-surface-600 mt-1 text-xs">Ostatnio ruszane encje</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="app-panel rounded-[1.85rem] p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="text-primary-700 rounded-[1rem] border border-[rgba(33,71,102,0.12)] bg-[rgba(111,146,164,0.14)] p-2.5">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-surface-500 text-sm font-semibold tracking-[0.18em] uppercase">
                Aktywne fronty
              </h2>
              <p className="text-surface-700 mt-1 text-sm">
                Najważniejsze osie presji, które nadal napędzają kampanię.
              </p>
            </div>
          </div>
          <ActiveFronts fronts={data.activeFronts} />
        </section>

        <section className="app-panel rounded-[1.85rem] p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="text-primary-700 rounded-[1rem] border border-[rgba(33,71,102,0.12)] bg-[rgba(111,146,164,0.14)] p-2.5">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-surface-500 text-sm font-semibold tracking-[0.18em] uppercase">
                Aktywne zegary
              </h2>
              <p className="text-surface-700 mt-1 text-sm">
                Presje w toku, gotowe do szybkiego tyknięcia przy stole.
              </p>
            </div>
          </div>
          <RunningClocks clocks={data.runningClocks} />
        </section>
      </div>

      <section className="app-panel rounded-[1.85rem] p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="text-primary-700 rounded-[1rem] border border-[rgba(33,71,102,0.12)] bg-[rgba(111,146,164,0.14)] p-2.5">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-surface-500 text-sm font-semibold tracking-[0.18em] uppercase">
              Ostatnio edytowane
            </h2>
            <p className="text-surface-700 mt-1 text-sm">
              Ślad najświeższych zmian w świecie i przygotowaniach MG.
            </p>
          </div>
        </div>
        <RecentChanges entities={data.recentEntities} />
      </section>
    </div>
  );
}
