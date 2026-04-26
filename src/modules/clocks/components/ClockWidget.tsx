import { updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { withClockAdvanceMeta } from '../clockAdvance';
import { ClockVisual } from './ClockVisual';
import type { Clock } from '../types';

interface ClockWidgetProps {
  clock: Clock;
  /** px diameter. Default 64 for inline/small usage */
  size?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Compact inline clock widget — can be embedded in any entity detail view.
 * Handles tick/un-tick directly via updateEntity.
 */
export function ClockWidget({ clock, size = 64, showLabel = true, className = '' }: ClockWidgetProps) {
  const { db } = useCampaign();
  const { segments, filled, isActive } = clock.data;
  const completed = filled >= segments;
  const dead = isActive === false;

  async function handleTick(newFilled: number) {
    if (dead) return;
    try {
      const nextFilled = Math.max(0, Math.min(newFilled, segments));
      await updateEntity(db, clock.id, {
        data: withClockAdvanceMeta(clock.data, nextFilled) as unknown as Record<string, unknown>,
      });
    } catch {
      toast.error('Nie udało się zaktualizować zegara');
    }
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${dead ? 'opacity-50' : ''} ${className}`}>
      <ClockVisual
        segments={segments}
        filled={filled}
        size={size}
        onTick={dead ? undefined : handleTick}
      />
      {showLabel && (
        <span className={`text-xs font-medium ${completed ? 'text-primary-600' : 'text-surface-500'}`}>
          {completed ? '✓ Ukończony' : `${filled}/${segments}`}
        </span>
      )}
    </div>
  );
}
