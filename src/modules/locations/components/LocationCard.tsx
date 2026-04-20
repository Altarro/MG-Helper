import React from 'react';
import { MapPin } from 'lucide-react';
import { LOCATION_TYPE_LABELS } from '../types';
import type { Location } from '../types';

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
      className="app-card flex w-full flex-col gap-3 rounded-[1.35rem] p-5 text-left transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(33,71,102,0.09)]">
            <MapPin className="h-4 w-4 text-primary-700" />
          </div>
          <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900">{location.name}</p>
        </div>
        <span className="app-pill-muted shrink-0 rounded-full px-2.5 py-1 text-xs">
          {LOCATION_TYPE_LABELS[locationType]}
        </span>
      </div>

      {danger > 0 && (
        <span className="app-danger-pill self-start rounded-full px-2.5 py-1 text-xs font-medium">
          {DANGER_LABELS[danger] ?? `Poziom ${danger}`}
        </span>
      )}

      {location.data.senses.see && (
        <p className="text-sm leading-6 text-surface-700">
          <span className="font-medium text-surface-800">Widzisz:</span> {location.data.senses.see}
        </p>
      )}

      {location.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {location.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {location.tags.length > 4 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">+{location.tags.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
});
