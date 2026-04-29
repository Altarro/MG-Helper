import type { ReactNode } from 'react';
import { CustomScrollViewport } from './CustomScrollViewport';

/** Przy `text-sm` + `leading-6` jedna linia ≈ 1.5rem wysokości okna przewijania. */
function cardScrollViewportHeight(maxLines: number): string {
  return `calc(1.5rem * ${maxLines})`;
}

export function CardScrollBlock({
  label,
  children,
  contentClassName = '',
  remeasureKey,
  headerRight,
  /** Domyślnie ~5½ linii; dla celu frontu / impulsu ustaw np. `5`. */
  maxLines = 5.5,
}: {
  label: string;
  children: ReactNode;
  contentClassName?: string;
  /** Zmiana treści — ponowny pomiar overflow / kółka. */
  remeasureKey?: string | number;
  headerRight?: ReactNode;
  maxLines?: number;
}) {
  const viewportH = cardScrollViewportHeight(maxLines);

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-surface-500 text-[11px] font-semibold tracking-wide uppercase">{label}</p>
        {headerRight}
      </div>
      <CustomScrollViewport
        maxHeight={viewportH}
        contentClassName={contentClassName}
        remeasureKey={remeasureKey}
      >
        {children}
      </CustomScrollViewport>
    </div>
  );
}
