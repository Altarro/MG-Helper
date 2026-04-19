import { Link } from 'react-router';
import { Shield } from 'lucide-react';
import type { Front } from '@modules/fronts/types';

interface ActiveFrontsProps {
  fronts: Front[];
}

export function ActiveFronts({ fronts }: ActiveFrontsProps) {
  if (fronts.length === 0) {
    return (
      <p className="text-sm text-surface-400">Brak aktywnych frontów.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {fronts.map((front) => (
        <li key={front.id}>
          <Link
            to={`/fronts/${front.id}`}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white px-4 py-3 hover:bg-surface-50 transition-colors"
          >
            <Shield className="h-4 w-4 shrink-0 text-primary-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-surface-900">{front.name}</p>
              {front.data.stakes.length > 0 && (
                <p className="truncate text-xs text-surface-500">{front.data.stakes[0]}</p>
              )}
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600">
              {front.data.category === 'campaign' ? 'Kampania' : 'Przygoda'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
