import { useLocation, useNavigate } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';
import { SearchBar } from '@shared/components/SearchBar';
import { CampaignSwitcher } from '@modules/campaigns';
import { LiveSessionIndicator } from '@shared/components/LiveSessionIndicator';
import type { ReactNode } from 'react';

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
  timeline: 'Oś czasu',
  notes: 'Notatki',
  live: 'Na żywo',
  report: 'Raport',
  cleanup: 'Sprzątanie',
  search: 'Wyszukiwanie',
  settings: 'Ustawienia',
};

export function TopBar({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Build breadcrumb segments from pathname
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-200 bg-white px-6">
      <div className="flex items-center gap-3">
        {children}
        <CampaignSwitcher />
        {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-surface-400 hover:text-surface-700"
          aria-label="Start"
        >
          <Home className="h-4 w-4" />
        </button>
        {segments.map((seg, i) => {
          const label = ROUTE_LABELS[seg] ?? seg;
          const isLast = i === segments.length - 1;
          return (
            <span key={seg} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-surface-300" aria-hidden="true" />
              {isLast ? (
                <span className="font-medium text-surface-800">{label}</span>
              ) : (
                <button
                  type="button"
                  className="text-surface-500 hover:text-surface-800"
                  onClick={() =>
                    navigate(
                      '/' + segments.slice(0, i + 1).join('/'),
                    )
                  }
                >
                  {label}
                </button>
              )}
            </span>
          );
        })}
      </nav>
      </div>

      {/* Search + live indicator */}
      <div className="flex items-center gap-3">
        <LiveSessionIndicator />
        <SearchBar />
      </div>
    </header>
  );
}
