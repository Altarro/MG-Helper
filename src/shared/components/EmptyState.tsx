import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-surface-300">{icon}</div>}
      <p className="text-base font-medium text-surface-600">{title}</p>
      {description && <p className="max-w-sm text-sm text-surface-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
