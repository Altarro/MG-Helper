import { useLocation, useNavigate } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { CampaignSwitcher } from '@modules/campaigns';
import { SearchBar } from '@shared/components/SearchBar';
import { LiveSessionIndicator } from '@shared/components/LiveSessionIndicator';
import { useCampaign } from '@shared/db/CampaignContext';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  npcs: 'Postacie',
  locations: 'Lokacje',
  fronts: 'Fronty',
  threats: 'Zagrożenia',
  clocks: 'Zegary',
  sessions: 'Sesje',
  factions: 'Frakcje',
  items: 'Przedmioty',
  graph: 'Graf',
  clues: 'Wskazówki',
  threads: 'Wątki',
  backstage: 'Za kulisami',
  notes: 'Notatki',
  live: 'Na żywo',
  report: 'Raport',
  cleanup: 'Sprzątanie',
  search: 'Wyszukiwanie',
  settings: 'Ustawienia',
};

export function PrimaryTopBar({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split('/').filter(Boolean);
  const { db } = useCampaign();
  const entityLabels = useLiveQuery(async () => {
    const dynamicIds = [...new Set(segments.filter((segment) => !(segment in ROUTE_LABELS)))];
    if (dynamicIds.length === 0) {
      return {} as Record<string, string>;
    }

    const entities = await db.entities.where('id').anyOf(dynamicIds).toArray();
    return Object.fromEntries(entities.map((entity) => [entity.id, entity.name]));
  }, [db, location.pathname]);

  return (
    <header className="app-panel flex h-16 items-center justify-between rounded-[1.75rem] px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {children}
        <CampaignSwitcher />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-[rgba(223,225,218,0.75)] hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            aria-label="Dashboard"
            title="Dashboard"
          >
            <Home className="h-4 w-4" />
          </button>
          {segments.length === 0 && (
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-surface-400" aria-hidden="true" />
              <span aria-current="page" className="font-medium text-surface-800">Dashboard</span>
            </span>
          )}
          {segments.map((seg, i) => {
            const label =
              ROUTE_LABELS[seg] ?? entityLabels?.[seg] ?? (entityLabels ? decodeURIComponent(seg) : '...');
            const isLast = i === segments.length - 1;

            return (
              <span key={seg} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-surface-400" aria-hidden="true" />
                {isLast ? (
                  <span
                    aria-current="page"
                    title={label}
                    className="max-w-56 truncate font-medium text-primary-800"
                  >
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    title={label}
                    className="max-w-48 truncate rounded-lg px-2 py-1 text-surface-600 transition-colors hover:bg-[rgba(223,225,218,0.75)] hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    onClick={() => navigate('/' + segments.slice(0, i + 1).join('/'))}
                  >
                    {label}
                  </button>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <LiveSessionIndicator />
        <SearchBar />
      </div>
    </header>
  );
}
