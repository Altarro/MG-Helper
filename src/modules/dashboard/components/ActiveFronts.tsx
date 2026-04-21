import { Link } from 'react-router';
import { ArrowRight, Shield } from 'lucide-react';
import type { Front } from '@modules/fronts/types';

interface ActiveFrontsProps {
  fronts: Front[];
}

export function ActiveFronts({ fronts }: ActiveFrontsProps) {
  if (fronts.length === 0) {
    return (
      <div className="app-input-shell text-surface-500 rounded-[1.35rem] border-dashed px-4 py-5 text-sm">
        Brak aktywnych frontów.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {fronts.map((front) => {
        const stakesPreview = front.data.stakes.filter(Boolean).slice(0, 2);
        return (
          <li key={front.id}>
            <Link
              to={`/fronts/${front.id}`}
              className="app-card group flex items-start gap-4 rounded-[1.4rem] p-4 transition-all hover:-translate-y-0.5"
            >
              <div className="text-primary-700 rounded-[1rem] border border-[rgba(33,71,102,0.12)] bg-[rgba(111,146,164,0.14)] p-2.5">
                <Shield className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-surface-900 group-hover:text-primary-800 truncate text-base font-semibold tracking-[-0.02em]">
                    {front.name}
                  </h3>
                  <span className="app-pill rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {front.data.category === 'campaign' ? 'Kampania' : 'Przygoda'}
                  </span>
                </div>

                {front.description && (
                  <p className="text-surface-700 mt-2 line-clamp-2 text-sm leading-6">
                    {front.description.replace(/<[^>]+>/g, ' ')}
                  </p>
                )}

                {stakesPreview.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stakesPreview.map((stake) => (
                      <span
                        key={stake}
                        className="app-pill-muted rounded-full px-2.5 py-1 text-[11px] font-medium"
                      >
                        {stake}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-primary-700 hidden shrink-0 items-center gap-1 text-xs font-semibold sm:flex">
                Otwórz
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
