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
  GitFork,
  Settings,
  Sun,
  Moon,
  Compass,
  Milestone,
  CalendarDays,
  StickyNote,
} from 'lucide-react';
import { useDarkMode } from '@shared/hooks/useDarkMode';

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
    label: 'Fabula',
    items: [
      { to: '/fronts', label: 'Fronty', icon: Flame },
      { to: '/threats', label: 'Zagrozenia', icon: AlertTriangle },
      { to: '/threads', label: 'Watki', icon: Milestone },
      { to: '/clues', label: 'Wskazowki', icon: Compass },
    ],
  },
  {
    label: 'Swiat gry',
    items: [
      { to: '/locations', label: 'Lokacje', icon: MapPin },
      { to: '/npcs', label: 'Postacie', icon: Users },
      { to: '/factions', label: 'Frakcje', icon: Shield },
      { to: '/items', label: 'Przedmioty', icon: Package },
    ],
  },
  {
    label: 'Prowadzenie',
    items: [
      { to: '/sessions', label: 'Sesje', icon: BookOpen },
      { to: '/clocks', label: 'Zegary', icon: Clock },
      { to: '/timeline', label: 'Os czasu', icon: CalendarDays },
      { to: '/notes', label: 'Notatki', icon: StickyNote },
    ],
  },
  {
    label: 'Narzedzia',
    items: [{ to: '/graph', label: 'Graf', icon: GitFork }],
  },
] as const satisfies readonly NavGroup[];

function navLinkClassName(isActive: boolean) {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
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
      onClick={onClose}
      className={({ isActive }) => navLinkClassName(isActive)}
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export function PrimarySidebar({ onClose }: { onClose?: () => void }) {
  const [dark, toggleDark] = useDarkMode();

  return (
    <aside className="flex w-sidebar flex-col border-r border-surface-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-surface-200 px-4">
        <Flame className="h-6 w-6 text-primary-600" />
        <span className="text-lg font-bold text-surface-900">MG Helper</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-400">
              Start
            </div>
            <SidebarLink item={dashboardItem} onClose={onClose} />
          </div>

          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-400">
                {group.label}
              </div>
              {group.items.map((item) => (
                <SidebarLink key={item.to} item={item} onClose={onClose} />
              ))}
            </div>
          ))}
        </div>
      </nav>

      <div className="space-y-1 border-t border-surface-200 p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) => navLinkClassName(isActive)}
        >
          <Settings className="h-4 w-4" /> Ustawienia
        </NavLink>
        <button
          onClick={toggleDark}
          aria-label={dark ? 'Wlacz tryb jasny' : 'Wlacz tryb ciemny'}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Tryb jasny' : 'Tryb ciemny'}
        </button>
      </div>
    </aside>
  );
}
