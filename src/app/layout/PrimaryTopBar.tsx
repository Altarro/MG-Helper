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
  threats: 'Zagrozenia',
  clocks: 'Zegary',
  sessions: 'Sesje',
  factions: 'Frakcje',
  items: 'Przedmioty',
  graph: 'Graf',
  clues: 'Wskazowki',
  threads: 'Watki',
  timeline: 'Os czasu',
  notes: 'Notatki',
  live: 'Na zywo',
  report: 'Raport',
  cleanup: 'Sprzatanie',
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
    <header className="flex h-14 items-center justify-between border-b border-surface-200 bg-white px-6">
      <div className="flex items-center gap-3">
        {children}
        <CampaignSwitcher />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md p-1 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            aria-label="Dashboard"
            title="Dashboard"
          >
            <Home className="h-4 w-4" />
          </button>
          {segments.length === 0 && (
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-surface-300" aria-hidden="true" />
              <span aria-current="page" className="font-medium text-surface-800">Dashboard</span>
            </span>
          )}
          {segments.map((seg, i) => {
            const label =
              ROUTE_LABELS[seg] ?? entityLabels?.[seg] ?? (entityLabels ? decodeURIComponent(seg) : '...');
            const isLast = i === segments.length - 1;

            return (
              <span key={seg} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-surface-300" aria-hidden="true" />
                {isLast ? (
                  <span
                    aria-current="page"
                    title={label}
                    className="max-w-56 truncate font-medium text-surface-800"
                  >
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    title={label}
                    className="max-w-48 truncate rounded-md px-1 py-0.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
