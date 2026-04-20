import type { ReactNode } from 'react';

interface InlineEmptyStateProps {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function InlineEmptyState({ message, icon, action }: InlineEmptyStateProps) {
  return (
    <div className="app-input-shell text-surface-500 rounded-[1.25rem] border-dashed px-4 py-4 text-sm">
      <div className="flex items-start gap-3">
        {icon ? <span className="text-surface-300 mt-0.5">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <p className="leading-6">{message}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
