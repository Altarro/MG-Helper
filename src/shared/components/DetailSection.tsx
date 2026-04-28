import type { ReactNode } from 'react';

type DetailSectionTone = 'default' | 'muted' | 'accent';

interface DetailSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: DetailSectionTone;
  className?: string;
  contentClassName?: string;
  /** Kotwica dla spisu treści na stronie detalu (`scrollWindowToElementId`). */
  sectionId?: string;
}

const TONE_CLASSES: Record<DetailSectionTone, string> = {
  default: 'app-panel',
  muted: 'bg-[linear-gradient(180deg,rgba(216,219,211,0.92)_0%,rgba(203,207,198,0.96)_100%)] border border-[rgba(86,93,94,0.14)] shadow-[0_14px_30px_rgba(18,45,66,0.06),inset_0_1px_0_rgba(255,244,220,0.18)]',
  accent: 'bg-[linear-gradient(180deg,rgba(224,231,234,0.92)_0%,rgba(205,216,221,0.97)_100%)] border border-[rgba(33,71,102,0.14)] shadow-[0_14px_30px_rgba(18,45,66,0.08),inset_0_1px_0_rgba(255,244,220,0.18)]',
};

export function DetailSection({
  title,
  description,
  action,
  children,
  tone = 'default',
  className = '',
  contentClassName = '',
  sectionId,
}: DetailSectionProps) {
  return (
    <section
      id={sectionId}
      className={`rounded-[1.6rem] p-5 lg:p-6 ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      <div className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">
            {title}
          </h2>
          {description && (
            <p className="text-surface-500/90 mt-1.5 w-full min-w-0 max-w-[68ch] text-[11px] font-normal leading-snug text-pretty">
              {description}
            </p>
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={['min-w-0 w-full', contentClassName].filter(Boolean).join(' ')}>{children}</div>
    </section>
  );
}
