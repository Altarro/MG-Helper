import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { LoadingPage } from '@shared/components/LoadingSpinner';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { RequireCampaign } from './RequireCampaign';

// Lazy-loaded module pages — will be added as modules are implemented
const DashboardPage = lazy(() =>
  import('@modules/dashboard').then((m) => ({ default: m.DashboardPage ?? Placeholder })),
);
const SearchResultsPage = lazy(() =>
  import('@modules/search/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })),
);
const ClockList = lazy(() =>
  import('@modules/clocks').then((m) => ({ default: m.ClockList })),
);
const ClockDetail = lazy(() =>
  import('@modules/clocks').then((m) => ({ default: m.ClockDetail })),
);
const NpcList = lazy(() =>
  import('@modules/npcs').then((m) => ({ default: m.NpcList })),
);
const NpcDetail = lazy(() =>
  import('@modules/npcs').then((m) => ({ default: m.NpcDetail })),
);
const LocationList = lazy(() =>
  import('@modules/locations').then((m) => ({ default: m.LocationList })),
);
const LocationDetail = lazy(() =>
  import('@modules/locations').then((m) => ({ default: m.LocationDetail })),
);
const FrontList = lazy(() =>
  import('@modules/fronts').then((m) => ({ default: m.FrontList })),
);
const FrontDetail = lazy(() =>
  import('@modules/fronts').then((m) => ({ default: m.FrontDetail })),
);
const ThreatList = lazy(() =>
  import('@modules/fronts').then((m) => ({ default: m.ThreatList })),
);
const ThreatDetail = lazy(() =>
  import('@modules/fronts').then((m) => ({ default: m.ThreatDetail })),
);
const SessionList = lazy(() =>
  import('@modules/sessions').then((m) => ({ default: m.SessionList })),
);
const SessionDetail = lazy(() =>
  import('@modules/sessions').then((m) => ({ default: m.SessionDetail })),
);
const SessionLive = lazy(() =>
  import('@modules/sessions').then((m) => ({ default: m.SessionLive })),
);
const SessionCleanup = lazy(() =>
  import('@modules/sessions').then((m) => ({ default: m.SessionCleanup })),
);
const FactionList = lazy(() =>
  import('@modules/factions').then((m) => ({ default: m.FactionList })),
);
const FactionDetail = lazy(() =>
  import('@modules/factions').then((m) => ({ default: m.FactionDetail })),
);
const ItemList = lazy(() =>
  import('@modules/items').then((m) => ({ default: m.ItemList })),
);
const ItemDetail = lazy(() =>
  import('@modules/items').then((m) => ({ default: m.ItemDetail })),
);
const GraphPage = lazy(() =>
  import('@modules/graph').then((m) => ({ default: m.GraphPage })),
);
const SettingsPage = lazy(() =>
  import('@modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ClueList = lazy(() =>
  import('@modules/clues').then((m) => ({ default: m.ClueList })),
);
const ClueDetail = lazy(() =>
  import('@modules/clues').then((m) => ({ default: m.ClueDetail })),
);
const ThreadList = lazy(() =>
  import('@modules/threads').then((m) => ({ default: m.ThreadList })),
);
const ThreadDetail = lazy(() =>
  import('@modules/threads').then((m) => ({ default: m.ThreadDetail })),
);
const TimelinePage = lazy(() =>
  import('@modules/timeline').then((m) => ({ default: m.TimelinePage })),
);
const NoteList = lazy(() =>
  import('@modules/notes').then((m) => ({ default: m.NoteList })),
);
const NoteDetail = lazy(() =>
  import('@modules/notes').then((m) => ({ default: m.NoteDetail })),
);
const SessionReport = lazy(() =>
  import('@modules/sessions').then((m) => ({ default: m.SessionReport })),
);
const CampaignList = lazy(() =>
  import('@modules/campaigns').then((m) => ({ default: m.CampaignList })),
);

function Placeholder({ title = 'Wkrótce…' }: { title?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-bold text-surface-700">{title}</h1>
    </div>
  );
}

function NotFound() {
  return <Placeholder title="404 — Nie znaleziono" />;
}

export function AppRouter() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route path="/campaigns" element={<ErrorBoundary name="Kampanie"><CampaignList /></ErrorBoundary>} />
          <Route
            path="/*"
            element={
              <RequireCampaign>
                <Routes>
                  <Route path="/" element={<ErrorBoundary name="Panel główny"><DashboardPage /></ErrorBoundary>} />
                  <Route path="/npcs" element={<ErrorBoundary name="Postacie"><NpcList /></ErrorBoundary>} />
                  <Route path="/npcs/:id" element={<ErrorBoundary name="Postacie"><NpcDetail /></ErrorBoundary>} />
                  <Route path="/locations" element={<ErrorBoundary name="Lokacje"><LocationList /></ErrorBoundary>} />
                  <Route path="/locations/:id" element={<ErrorBoundary name="Lokacje"><LocationDetail /></ErrorBoundary>} />
                  <Route path="/fronts" element={<ErrorBoundary name="Fronty"><FrontList /></ErrorBoundary>} />
                  <Route path="/fronts/:id" element={<ErrorBoundary name="Fronty"><FrontDetail /></ErrorBoundary>} />
                  <Route path="/threats" element={<ErrorBoundary name="Zagrozenia"><ThreatList /></ErrorBoundary>} />
                  <Route path="/threats/:id" element={<ErrorBoundary name="Zagrozenia"><ThreatDetail /></ErrorBoundary>} />
                  <Route path="/clocks" element={<ErrorBoundary name="Zegary"><ClockList /></ErrorBoundary>} />
                  <Route path="/clocks/:id" element={<ErrorBoundary name="Zegary"><ClockDetail /></ErrorBoundary>} />
                  <Route path="/sessions" element={<ErrorBoundary name="Sesje"><SessionList /></ErrorBoundary>} />
                  <Route path="/sessions/:id" element={<ErrorBoundary name="Sesje"><SessionDetail /></ErrorBoundary>} />
                  <Route path="/sessions/:id/live" element={<ErrorBoundary name="Sesja na żywo"><SessionLive /></ErrorBoundary>} />
                  <Route path="/sessions/:id/cleanup" element={<ErrorBoundary name="Sprzątanie sesji"><SessionCleanup /></ErrorBoundary>} />
                  <Route path="/sessions/:id/report" element={<ErrorBoundary name="Raport sesji"><SessionReport /></ErrorBoundary>} />
                  <Route path="/factions" element={<ErrorBoundary name="Frakcje"><FactionList /></ErrorBoundary>} />
                  <Route path="/factions/:id" element={<ErrorBoundary name="Frakcje"><FactionDetail /></ErrorBoundary>} />
                  <Route path="/items" element={<ErrorBoundary name="Przedmioty"><ItemList /></ErrorBoundary>} />
                  <Route path="/items/:id" element={<ErrorBoundary name="Przedmioty"><ItemDetail /></ErrorBoundary>} />
                  <Route path="/graph" element={<ErrorBoundary name="Graf"><GraphPage /></ErrorBoundary>} />
                  <Route path="/clues" element={<ErrorBoundary name="Wskazówki"><ClueList /></ErrorBoundary>} />
                  <Route path="/clues/:id" element={<ErrorBoundary name="Wskazówki"><ClueDetail /></ErrorBoundary>} />
                  <Route path="/threads" element={<ErrorBoundary name="Wątki"><ThreadList /></ErrorBoundary>} />
                  <Route path="/threads/:id" element={<ErrorBoundary name="Wątki"><ThreadDetail /></ErrorBoundary>} />
                  <Route path="/timeline" element={<ErrorBoundary name="Oś czasu"><TimelinePage /></ErrorBoundary>} />
                  <Route path="/notes" element={<ErrorBoundary name="Notatki"><NoteList /></ErrorBoundary>} />
                  <Route path="/notes/:id" element={<ErrorBoundary name="Notatki"><NoteDetail /></ErrorBoundary>} />
                  <Route path="/search" element={<ErrorBoundary name="Wyszukiwanie"><SearchResultsPage /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary name="Ustawienia"><SettingsPage /></ErrorBoundary>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </RequireCampaign>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
