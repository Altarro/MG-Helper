import type { ReactNode } from 'react';

interface InlineEmptyStateProps {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function InlineEmptyState({
  message,
  icon,
  action,
}: InlineEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-surface-200 bg-surface-50 px-3 py-3 text-sm text-surface-500">
      <div className="flex items-start gap-2">
        {icon ? <span className="mt-0.5 text-surface-300">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <p>{message}</p>
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
