import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

interface CollapsiblePanelProps {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
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
    <div className="app-panel overflow-hidden rounded-[1.35rem]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold tracking-[-0.01em] text-surface-800 transition-colors hover:bg-[rgba(223,225,218,0.7)]"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary-700" />
        <span className="flex-1">{title}</span>
        {!open && badge != null && badge > 0 && (
          <span className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-surface-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-surface-500" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
