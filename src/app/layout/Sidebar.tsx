import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Flame,
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
  StickyNote,
  Theater,
} from 'lucide-react';
import { useDarkMode } from '@shared/hooks/useDarkMode';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/npcs', label: 'Postacie', icon: Users },
  { to: '/locations', label: 'Lokacje', icon: MapPin },
  { to: '/fronts', label: 'Fronty', icon: Flame },
  { to: '/clocks', label: 'Zegary', icon: Clock },
  { to: '/sessions', label: 'Sesje', icon: BookOpen },
  { to: '/factions', label: 'Frakcje', icon: Shield },
  { to: '/items', label: 'Przedmioty', icon: Package },
  { to: '/graph', label: 'Graf', icon: GitFork },
  { to: '/clues', label: 'Wskazówki', icon: Compass },
  { to: '/threads', label: 'Wątki', icon: Milestone },
  { to: '/backstage', label: 'Za kulisami', icon: Theater },
  { to: '/notes', label: 'Notatki', icon: StickyNote },
] as const;

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [dark, toggleDark] = useDarkMode();
  return (
    <aside className="flex w-sidebar flex-col border-r border-surface-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-surface-200 px-4">
        <Flame className="h-6 w-6 text-primary-600" />
        <span className="text-lg font-bold text-surface-900">MG Helper</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-surface-200 p-2 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
            }`
          }
        >
          <Settings className="h-4 w-4" /> Ustawienia
        </NavLink>
        <button
          onClick={toggleDark}
          aria-label={dark ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Tryb jasny' : 'Tryb ciemny'}
        </button>
      </div>
    </aside>
  );
}
