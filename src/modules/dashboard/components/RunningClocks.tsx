import { Link } from 'react-router';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import type { Clock } from '@modules/clocks/types';

interface RunningClocksProps {
  clocks: Clock[];
}

export function RunningClocks({ clocks }: RunningClocksProps) {
  if (clocks.length === 0) {
    return (
      <div className="app-input-shell text-surface-500 rounded-[1.35rem] border-dashed px-4 py-5 text-sm">
        Brak aktywnych zegarów.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {clocks.map((clock) => (
        <Link
          key={clock.id}
          to={`/clocks/${clock.id}`}
          className="app-card group flex min-h-[178px] flex-col items-start gap-4 rounded-[1.35rem] p-4 transition-all hover:-translate-y-0.5"
        >
          <ClockWidget clock={clock} size={72} />

          <div className="min-w-0">
            <p className="text-surface-900 group-hover:text-primary-800 line-clamp-2 text-sm leading-5 font-semibold">
              {clock.name}
            </p>
            <p className="text-surface-600 mt-2 text-xs">
              <span className="text-primary-700 font-semibold">
                {clock.data.filled}/{clock.data.segments}
              </span>{' '}
              segmentów
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
