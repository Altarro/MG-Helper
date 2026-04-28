import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from './EmptyState';

export type DetailNotFoundProps = {
  title: string;
  description: string;
  to: string;
  linkLabel: string;
  icon: LucideIcon;
};

export function DetailNotFound({ title, description, to, linkLabel, icon: Icon }: DetailNotFoundProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="app-panel rounded-[1.8rem] p-6">
        <EmptyState
          icon={<Icon className="h-10 w-10 text-primary-300" />}
          title={title}
          description={description}
          action={
            <Link
              to={to}
              className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              {linkLabel}
            </Link>
          }
        />
      </div>
    </div>
  );
}
