import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { PrimarySidebar } from './PrimarySidebar';
import { PrimaryTopBar } from './PrimaryTopBar';
import { Menu } from 'lucide-react';
import { useBackupReminder } from '@shared/hooks/useBackupReminder';
import { useCampaign } from '@shared/db/CampaignContext';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';

const PAGE_SCROLL_TOP_ROUTES = new Set([
  '/',
  '/backstage',
  '/clocks',
  '/clues',
  '/factions',
  '/fronts',
  '/graph',
  '/items',
  '/locations',
  '/notes',
  '/npcs',
  '/search',
  '/sessions',
  '/settings',
  '/threats',
  '/threads',
]);

function hasPageScrollTopFab(pathname: string): boolean {
  if (PAGE_SCROLL_TOP_ROUTES.has(pathname)) return true;
  return /^\/sessions\/[^/]+\/live$/.test(pathname);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { campaignId } = useCampaign();
  const { pathname } = useLocation();
  useBackupReminder(campaignId);

  return (
    <div className="flex min-h-dvh">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — hidden on mobile, collapsible on lg */}
      <div
        data-sidebar
        className={`fixed inset-y-0 left-0 z-40 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <PrimarySidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col">
        <div data-topbar>
          <PrimaryTopBar>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mr-2 rounded-md p-2 text-surface-500 hover:bg-surface-100 lg:hidden"
              aria-label="Otwórz menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </PrimaryTopBar>
        </div>
        <main className="flex-1 px-5 py-5 lg:px-7 lg:py-6">{children}</main>
        <DetailScrollTopFab enabled={hasPageScrollTopFab(pathname)} />
      </div>
    </div>
  );
}
