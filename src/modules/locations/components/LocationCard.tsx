import React from 'react';
import { MapPin } from 'lucide-react';
import { LOCATION_TYPE_LABELS } from '../types';
import type { Location } from '../types';

const DANGER_COLORS = [
  'bg-green-100 text-green-700',
  'bg-lime-100 text-lime-700',
  'bg-yellow-100 text-yellow-700',
  'bg-orange-100 text-orange-700',
  'bg-red-100 text-red-700',
  'bg-purple-100 text-purple-700',
];

const DANGER_LABELS = ['Bezpieczna', 'Spokojnie', 'Umiarkowane', 'Niebezpiecznie', 'Śmiertelnie', 'Apokaliptyczne'];

interface LocationCardProps {
  location: Location;
  onClick?: () => void;
}

export const LocationCard = React.memo(function LocationCard({ location, onClick }: LocationCardProps) {
  const { locationType, danger } = location.data;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl border border-surface-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-primary-500" />
          <p className="truncate font-semibold text-surface-900">{location.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600">
          {LOCATION_TYPE_LABELS[locationType]}
        </span>
      </div>

      {/* Danger indicator */}
      {danger > 0 && (
        <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${DANGER_COLORS[danger] ?? ''}`}>
          ⚠ {DANGER_LABELS[danger] ?? `Danger ${danger}`}
        </span>
      )}

      {/* Senses preview */}
      {location.data.senses.see && (
        <p className="truncate text-sm text-surface-500">
          <span className="font-medium text-surface-400">Widzisz:</span> {location.data.senses.see}
        </p>
      )}

      {location.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {location.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600">
              {tag}
            </span>
          ))}
          {location.tags.length > 4 && (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-400">
              +{location.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
});
