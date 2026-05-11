import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CustomScrollViewport } from './CustomScrollViewport';

const SECTION_VIEWPORT_LINE_HEIGHT_REM = 1.5;

type CardAccentTone = 'primary' | 'warning' | 'surface' | 'danger' | 'success';

const TONE_CLASSES: Record<CardAccentTone, { accent: string; icon: string; label: string }> = {
  primary: {
    accent: 'border-l-primary-500/55 bg-[rgba(111,146,164,0.08)]',
    icon: 'bg-[rgba(111,146,164,0.16)] text-primary-700',
    label: 'text-primary-800',
  },
  warning: {
    accent: 'border-l-warning-500/60 bg-[rgba(242,196,88,0.1)]',
    icon: 'bg-[rgba(242,196,88,0.18)] text-warning-600',
    label: 'text-warning-600',
  },
  surface: {
    accent: 'border-l-surface-400/70 bg-[rgba(255,250,240,0.16)]',
    icon: 'bg-[rgba(86,93,94,0.1)] text-surface-600',
    label: 'text-surface-700',
  },
  danger: {
    accent: 'border-l-danger-500/55 bg-[rgba(176,108,103,0.08)]',
    icon: 'bg-[rgba(176,108,103,0.14)] text-danger-700',
    label: 'text-danger-700',
  },
  success: {
    accent: 'border-l-success-500/55 bg-[rgba(106,143,135,0.09)]',
    icon: 'bg-[rgba(106,143,135,0.15)] text-success-600',
    label: 'text-success-600',
  },
};

function cardSectionViewportHeight(maxLines: number): string {
  return `calc(${SECTION_VIEWPORT_LINE_HEIGHT_REM}rem * ${maxLines})`;
}

export function CardAccentSection({
  label,
  icon: Icon,
  tone,
  children,
  remeasureKey,
  maxLines,
  contentClassName = 'pr-0.5',
}: {
  label: string;
  icon: LucideIcon;
  tone: CardAccentTone;
  children: ReactNode;
  remeasureKey: string;
  maxLines: number;
  contentClassName?: string;
}) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <section
      className={`min-w-0 rounded-r-2xl border-l-2 py-2.5 pr-2.5 pl-3 ${toneClasses.accent}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${toneClasses.icon}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className={`text-[11px] font-semibold tracking-wide uppercase ${toneClasses.label}`}>
          {label}
        </p>
      </div>
      <CustomScrollViewport
        maxHeight={cardSectionViewportHeight(maxLines)}
        contentClassName={contentClassName}
        remeasureKey={remeasureKey}
      >
        {children}
      </CustomScrollViewport>
    </section>
  );
}

export function CardAccentList({
  items,
  markerClassName,
}: {
  items: string[];
  markerClassName: string;
}) {
  return (
    <ul className="text-surface-700 flex flex-col gap-1.5 text-sm leading-6">
      {items.map((item, index) => (
        <li key={`${index}:${item}`} className="grid grid-cols-[0.6rem_minmax(0,1fr)] gap-2">
          <span className={`mt-[0.7rem] h-1.5 w-1.5 rounded-full ${markerClassName}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
