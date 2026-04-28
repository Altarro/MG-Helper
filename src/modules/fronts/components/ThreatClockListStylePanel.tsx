import type { MouseEvent } from 'react';
import { CustomScrollViewport } from '@shared/components/CustomScrollViewport';
import { TickProgress } from '@shared/components/TickProgress';
import { useCampaign } from '@shared/db/CampaignContext';
import { updateEntity } from '@shared/db/operations';
import { toast } from 'sonner';
import { withClockAdvanceMeta } from '@modules/clocks/clockAdvance';
import type { Clock } from '@modules/clocks/types';

export type ThreatClockListStylePanelVariant = 'compact' | 'comfortable';

export interface ThreatClockListStylePanelProps {
  clock: Clock;
  triggerLines?: readonly string[];
  /** Karta na liście: zatrzymaj propagację, żeby klik w segment nie otwierał karty */
  stopPointerPropagation?: boolean;
  /** Na liście: krótki podgląd Teraz/Następnie; na stronie detalu zwykle wyłączone (jest siatka etapów) */
  showTickProgress?: boolean;
  /** `comfortable` — strona detalu zagrożenia: większy tytuł zegara i czytelniejsze warunki tykania */
  variant?: ThreatClockListStylePanelVariant;
}

/**
 * Blok zegara jak na karcie zagrożenia na liście: nazwa (pogrubiona), warunki, poziomy pasek segmentów z tykaniem.
 */
export function ThreatClockListStylePanel({
  clock,
  triggerLines = [],
  stopPointerPropagation = false,
  showTickProgress = true,
  variant = 'compact',
}: ThreatClockListStylePanelProps) {
  const { db } = useCampaign();
  const lines = triggerLines.filter((l) => l.length > 0);
  const tickLabels = clock.data.tickLabels ?? [];
  const { segments, filled } = clock.data;
  const isActive = clock.data.isActive !== false;
  const comfortable = variant === 'comfortable';

  async function handleSegmentClick(i: number, e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const current = clock.data.filled;
    const isNext = i === current && current < clock.data.segments;
    const isUndo = i === current - 1 && current > 0;
    const clickable = (isNext || isUndo) && isActive;
    if (!clickable) return;
    let newFilled = current;
    if (i === current) newFilled = current + 1;
    else if (i === current - 1) newFilled = current - 1;
    newFilled = Math.max(0, Math.min(newFilled, clock.data.segments));
    try {
      await updateEntity(db, clock.id, {
        data: withClockAdvanceMeta(clock.data, newFilled) as unknown as Record<string, unknown>,
      });
    } catch {
      toast.error('Nie udało się zaktualizować zegara');
    }
  }

  const tickWhenItems = lines.map((line, index) => (
    <li
      key={`${clock.id}-tick-when-${index}`}
      className={comfortable ? 'flex gap-2 py-0.5' : 'flex gap-0.5 py-[0.15rem]'}
      title={line}
    >
      <span
        className={
          comfortable
            ? 'text-primary-600/80 mt-[0.35em] shrink-0 text-xs leading-none'
            : 'text-primary-600/75 mt-[0.18em] shrink-0 text-[8px] leading-none'
        }
        aria-hidden
      >
        ▸
      </span>
      <span
        className={
          comfortable
            ? 'min-w-0 flex-1 break-words text-pretty'
            : 'line-clamp-2 min-w-0 flex-1 break-words'
        }
      >
        {line}
      </span>
    </li>
  ));

  const ulComfortClass = 'list-none space-y-2 pl-0 text-base leading-relaxed text-surface-800';
  const ulCompactClass = 'list-none space-y-0 pl-0 text-[10px] leading-tight text-surface-600';

  return (
    <div
      className={
        comfortable
          ? 'flex flex-col gap-3 rounded-[1.35rem] border border-[rgba(86,93,94,0.14)] bg-[rgba(86,93,94,0.04)] px-5 py-4'
          : 'flex flex-col gap-1.5 rounded-xl border border-[rgba(86,93,94,0.14)] bg-[rgba(86,93,94,0.04)] px-3 py-2.5'
      }
    >
      <p
        className={
          comfortable
            ? 'text-surface-900 text-xl font-semibold tracking-[-0.02em] break-words leading-snug sm:text-2xl'
            : stopPointerPropagation
              ? 'text-surface-900 truncate text-sm leading-snug font-semibold'
              : 'text-surface-900 text-sm leading-snug font-semibold break-words'
        }
      >
        {clock.name}
      </p>

      {comfortable && clock.data.isActive === false && (
        <p className="text-surface-500 -mt-1 text-sm">Zegar wstrzymany — nie można przesuwać segmentów.</p>
      )}

      {lines.length > 0 && (
        <div
          className={
            comfortable
              ? 'min-w-0 border-b border-[rgba(86,93,94,0.12)] pb-3'
              : 'min-w-0 border-b border-[rgba(86,93,94,0.1)] pb-1.5'
          }
        >
          <p
            className={
              comfortable
                ? 'text-surface-500 text-xs font-semibold tracking-wide uppercase'
                : 'text-surface-500 text-[10px] font-medium tracking-wide uppercase'
            }
          >
            Zegar tyka, gdy
          </p>
          {comfortable && lines.length > 3 ? (
            <CustomScrollViewport
              maxHeight="calc(3 * (1.625rem + 0.25rem) + 2 * 0.5rem)"
              contentClassName="mt-2"
              remeasureKey={lines.join('\u0001')}
              onViewportMouseDown={stopPointerPropagation ? (e) => e.stopPropagation() : undefined}
            >
              <ul className={ulComfortClass} aria-label="Warunki tykania zegara">
                {tickWhenItems}
              </ul>
            </CustomScrollViewport>
          ) : comfortable ? (
            <ul className={`mt-2 ${ulComfortClass}`} aria-label="Warunki tykania zegara">
              {tickWhenItems}
            </ul>
          ) : lines.length > 3 ? (
            <CustomScrollViewport
              maxHeight="calc(1.1rem * 3 + 0.125rem * 2)"
              contentClassName="mt-0.5"
              remeasureKey={lines.join('\u0001')}
              onViewportMouseDown={stopPointerPropagation ? (e) => e.stopPropagation() : undefined}
            >
              <ul className={ulCompactClass} aria-label="Warunki tykania zegara">
                {tickWhenItems}
              </ul>
            </CustomScrollViewport>
          ) : (
            <ul
              className={`mt-0.5 ${ulCompactClass}`}
              aria-label="Warunki tykania zegara"
              onMouseDown={stopPointerPropagation ? (e) => e.stopPropagation() : undefined}
            >
              {tickWhenItems}
            </ul>
          )}
        </div>
      )}

      <div
        className={`flex w-full min-w-0 gap-0.5 overflow-visible rounded ${comfortable ? 'pt-0.5' : ''}`}
        aria-label={`Zegar: ${filled} z ${segments} segmentów wypełnionych`}
      >
        {Array.from({ length: segments }, (_, i) => {
          const isFilled = i < filled;
          const bgClass = isFilled
            ? isActive
              ? 'bg-[rgba(111,146,164,0.82)]'
              : 'bg-surface-500'
            : 'bg-[rgba(86,93,94,0.24)]';
          const isNext = i === filled && filled < segments;
          const isUndo = i === filled - 1 && filled > 0;
          const isClickable = (isNext || isUndo) && isActive;
          const clickHintClass = isClickable
            ? isNext
              ? 'cursor-pointer hover:z-10 hover:scale-y-[1.15] hover:ring-1 hover:ring-[rgba(33,71,102,0.45)] hover:ring-offset-1 hover:ring-offset-[rgba(231,226,210,0.95)]'
              : 'cursor-pointer hover:z-10 hover:scale-y-[1.15] hover:ring-1 hover:ring-surface-500/80 hover:ring-offset-1 hover:ring-offset-[rgba(231,226,210,0.95)]'
            : '';

          return (
            <button
              key={i}
              type="button"
              onClick={(e) => void handleSegmentClick(i, e)}
              onMouseDown={stopPointerPropagation ? (e) => e.stopPropagation() : undefined}
              disabled={!isClickable}
              title={isClickable ? (isNext ? 'Dodaj 1 tick' : 'Cofnij 1 tick') : undefined}
              aria-label={
                isClickable
                  ? i === filled
                    ? `Wypełnij segment ${i + 1}`
                    : `Cofnij segment ${i + 1}`
                  : undefined
              }
              className={`${comfortable ? 'h-4' : 'h-3'} min-w-0 flex-1 overflow-hidden rounded-[4px] transition-all focus:outline-none ${bgClass} ${clickHintClass}`}
            />
          );
        })}
      </div>

      {showTickProgress && tickLabels.length > 0 && (
        <TickProgress
          tickLabels={tickLabels}
          filled={filled}
          segments={segments}
          uniformCaption
          className="pt-0.5"
        />
      )}
    </div>
  );
}
