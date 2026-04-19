import { memo } from 'react';
import { Link } from 'react-router';
import { Flag } from 'lucide-react';
import type { Faction } from '../types';

interface FactionCardProps {
  faction: Faction;
}

export const FactionCard = memo(function FactionCard({ faction }: FactionCardProps) {
  return (
    <Link
      to={`/factions/${faction.id}`}
      className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Flag className="h-4 w-4 shrink-0 text-primary-500" />
        <h3 className="truncate font-semibold text-surface-900">{faction.name}</h3>
      </div>
      {faction.data.goals.length > 0 && (
        <p className="text-xs text-surface-500 line-clamp-2">
          {faction.data.goals.slice(0, 2).join(' • ')}
        </p>
      )}
      {faction.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {faction.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
});
