import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Flame,
  AlertTriangle,
  Clock,
  BookOpen,
  Shield,
  Package,
  Settings,
  Compass,
  Milestone,
  StickyNote,
  Theater,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getLiveSessionMarker,
  LIVE_SESSION_MARKER_UPDATED_EVENT,
  type LiveSessionMarker,
} from '@modules/sessions/hooks/useLiveSessionState';
import { useCampaign } from '@shared/db/CampaignContext';
import { trackNavigationClick } from '@shared/telemetry/navigationTelemetry';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const dashboardItem = {
  to: '/',
  label: 'Dashboard',
  icon: LayoutDashboard,
} as const satisfies NavItem;

const navGroups = [
  {
    label: 'Fabuła',
    items: [
      { to: '/fronts', label: 'Fronty', icon: Flame },
      { to: '/threats', label: 'Zagrożenia', icon: AlertTriangle },
      { to: '/threads', label: 'Wątki', icon: Milestone },
      { to: '/clues', label: 'Wskazówki', icon: Compass },
    ],
  },
  {
    label: 'Świat gry',
    items: [
      { to: '/factions', label: 'Frakcje', icon: Shield },
      { to: '/locations', label: 'Lokacje', icon: MapPin },
      { to: '/npcs', label: 'Postacie', icon: Users },
      { to: '/items', label: 'Przedmioty', icon: Package },
    ],
  },
  {
    label: 'Prowadzenie',
    items: [
      { to: '/sessions', label: 'Sesje', icon: BookOpen },
      { to: '/clocks', label: 'Zegary', icon: Clock },
      { to: '/backstage', label: 'Za kulisami', icon: Theater },
      { to: '/notes', label: 'Notatki', icon: StickyNote },
    ],
  },
] as const satisfies readonly NavGroup[];

function navLinkClassName(isActive: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
    isActive
      ? 'app-pill text-primary-800 shadow-sm'
      : 'text-surface-700 hover:bg-[rgba(223,225,218,0.72)] hover:text-primary-800'
  }`;
}

function SidebarLink({
  item,
  onClose,
}: {
  item: NavItem;
  onClose?: () => void;
}) {
  const { to, label, icon: Icon } = item;

  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={() => {
        trackNavigationClick('sidebar', to);
        onClose?.();
      }}
      className={({ isActive }) => navLinkClassName(isActive)}
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export function PrimarySidebar({ onClose }: { onClose?: () => void }) {
  const { campaignId } = useCampaign();
  const [liveMarker, setLiveMarker] = useState<LiveSessionMarker | null>(() => getLiveSessionMarker());

  useEffect(() => {
    function syncLiveMarker() {
      setLiveMarker(getLiveSessionMarker());
    }

    syncLiveMarker();
    window.addEventListener('storage', syncLiveMarker);
    window.addEventListener(LIVE_SESSION_MARKER_UPDATED_EVENT, syncLiveMarker);
    return () => {
      window.removeEventListener('storage', syncLiveMarker);
      window.removeEventListener(LIVE_SESSION_MARKER_UPDATED_EVENT, syncLiveMarker);
    };
  }, []);

  const isLiveInCurrentCampaign =
    liveMarker && (!liveMarker.campaignId || liveMarker.campaignId === campaignId);

  return (
    <aside className="flex w-sidebar flex-col border-r border-[rgba(18,45,66,0.12)] bg-[linear-gradient(180deg,rgba(223,225,218,0.95)_0%,rgba(210,212,203,0.98)_100%)] shadow-[inset_-1px_0_0_rgba(255,244,220,0.15)]">
      <div className="flex h-16 items-center gap-3 border-b border-[rgba(18,45,66,0.1)] px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(33,71,102,0.14)_0%,rgba(18,45,66,0.2)_100%)] shadow-[inset_0_1px_0_rgba(255,244,220,0.24)]">
          <Flame className="h-5 w-5 text-primary-700" />
        </div>
        <span className="text-[1.7rem] font-semibold tracking-[-0.03em] text-surface-900">MG Helper</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">
              Start
            </div>
            <SidebarLink item={dashboardItem} onClose={onClose} />
          </div>

          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">
                {group.label}
              </div>
              {group.items.map((item) => {
                if (item.to !== '/sessions') {
                  return <SidebarLink key={item.to} item={item} onClose={onClose} />;
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={false}
                    onClick={() => {
                      trackNavigationClick('sidebar', item.to);
                      onClose?.();
                    }}
                    className={({ isActive }) => navLinkClassName(isActive)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span>{item.label}</span>
                      <span className="flex items-center gap-1">
                        {isLiveInCurrentCampaign && (
                          <span className="rounded-full border border-[rgba(33,71,102,0.24)] bg-[rgba(111,146,164,0.16)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-800">
                            Live
                          </span>
                        )}
                      </span>
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="space-y-1 border-t border-[rgba(18,45,66,0.1)] p-2">
        <NavLink
          to="/settings"
          onClick={() => trackNavigationClick('sidebar', '/settings')}
          className={({ isActive }) => navLinkClassName(isActive)}
        >
          <Settings className="h-4 w-4" /> Ustawienia
        </NavLink>
      </div>
    </aside>
  );
}
