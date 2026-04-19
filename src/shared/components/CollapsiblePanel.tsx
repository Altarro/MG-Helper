import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

interface CollapsiblePanelProps {
  /** Key used to persist open/closed state in localStorage */
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  /** Count shown as badge when collapsed */
  badge?: number;
  children: ReactNode;
}

const LS_KEY = (id: string) => `panel-open:${id}`;

export function CollapsiblePanel({
  id,
  title,
  icon: Icon,
  defaultOpen = true,
  badge,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY(id));
      return stored !== null ? stored === 'true' : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY(id), String(open));
    } catch {
      // ignore quota errors
    }
  }, [id, open]);

  return (
    <div className="rounded-lg border border-surface-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-surface-700 hover:bg-surface-50 rounded-lg"
      >
        <Icon className="h-4 w-4 shrink-0 text-surface-500" />
        <span className="flex-1">{title}</span>
        {!open && badge != null && badge > 0 && (
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-surface-400" />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
