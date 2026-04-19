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
}

const TONE_CLASSES: Record<DetailSectionTone, string> = {
  default: 'border-surface-200 bg-white',
  muted: 'border-surface-200 bg-surface-50/70',
  accent: 'border-primary-100 bg-primary-50/70',
};

export function DetailSection({
  title,
  description,
  action,
  children,
  tone = 'default',
  className = '',
  contentClassName = '',
}: DetailSectionProps) {
  return (
    <section className={`rounded-xl border p-5 shadow-sm ${TONE_CLASSES[tone]} ${className}`.trim()}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-500">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-surface-500">{description}</p>
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
