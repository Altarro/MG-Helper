import { Shield, Clock, History } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { ActiveFronts } from './ActiveFronts';
import { RunningClocks } from './RunningClocks';
import { RecentChanges } from './RecentChanges';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';

export function DashboardPage() {
  const data = useDashboard();

  if (!data) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-bold text-surface-900">Dashboard</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Fronts */}
        <section className="rounded-xl border border-surface-200 bg-surface-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-800">Aktywne fronty</h2>
            <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
              {data.activeFronts.length}
            </span>
          </div>
          <ActiveFronts fronts={data.activeFronts} />
        </section>

        {/* Running Clocks */}
        <section className="rounded-xl border border-surface-200 bg-surface-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-800">Aktywne zegary</h2>
            <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
              {data.runningClocks.length}
            </span>
          </div>
          <RunningClocks clocks={data.runningClocks} />
        </section>
      </div>

      {/* Recent Changes */}
      <section className="rounded-xl border border-surface-200 bg-surface-50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-primary-500" />
          <h2 className="text-sm font-semibold text-surface-800">Ostatnio edytowane</h2>
        </div>
        <RecentChanges entities={data.recentEntities} />
      </section>
    </div>
  );
}

