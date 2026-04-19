import { Link } from 'react-router';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import type { Clock } from '@modules/clocks/types';

interface RunningClocksProps {
  clocks: Clock[];
}

export function RunningClocks({ clocks }: RunningClocksProps) {
  if (clocks.length === 0) {
    return (
      <p className="text-sm text-surface-400">Brak aktywnych zegarów.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-4">
      {clocks.map((clock) => (
        <Link key={clock.id} to={`/clocks/${clock.id}`} className="flex flex-col items-center gap-1.5 group">
          <ClockWidget clock={clock} size={56} />
          <span className="max-w-[80px] truncate text-center text-xs text-surface-600 group-hover:text-primary-600">
            {clock.name}
          </span>
          <span className="text-xs text-surface-400">
            {clock.data.filled}/{clock.data.segments}
          </span>
        </Link>
      ))}
    </div>
  );
}
