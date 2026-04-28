import { Link } from 'react-router';
import type { Clock } from '@modules/clocks/types';
import { ThreatClockListStylePanel } from './ThreatClockListStylePanel';

interface ThreatClockPreviewProps {
  clock: Clock;
  triggerText?: string;
}

/**
 * Podgląd powiązanego zegara na karcie zagrożenia: jak na liście (pasek segmentów + tykanie),
 * poniżej siatka kolejnych tyknięć (bez powtórki Teraz/Następnie z listy).
 */
export function ThreatClockPreview({ clock, triggerText }: ThreatClockPreviewProps) {
  const tickLabels = clock.data.tickLabels ?? [];
  const filled = clock.data.filled;
  const segments = clock.data.segments;
  const paddedLabels = Array.from({ length: segments }, (_, index) => tickLabels[index] ?? '');
  const triggerLines = (triggerText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="app-panel rounded-[1.5rem] p-6">
      <div className="mb-4 flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-surface-500 text-sm font-semibold tracking-wide uppercase">
            Powiązany zegar
          </h2>
          <span className="app-pill-muted rounded-full px-2 py-0.5 text-[11px] font-medium">
            {clock.data.kind === 'threat' ? 'Zegar zagrożenia' : 'Powiązany'}
          </span>
        </div>
        <Link
          to={`/clocks/${clock.id}`}
          className="text-primary-700 shrink-0 text-xs font-medium hover:underline"
        >
          Otwórz kartę zegara
        </Link>
      </div>

      <div className="min-w-0 w-full">
        <ThreatClockListStylePanel
          clock={clock}
          triggerLines={triggerLines}
          showTickProgress={false}
          variant="comfortable"
        />
      </div>

      {segments > 0 && (
        <div className="mt-6">
          <h3 className="text-surface-500 mb-3 text-xs font-semibold tracking-wide uppercase">
            Kolejne tyknięcia zegara
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paddedLabels.map((label, index) => {
              const isCurrent = index === filled - 1;
              const isPast = index < filled - 1;

              return (
                <div
                  key={`${clock.id}-preview-tick-${index}`}
                  className={`rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.06)] ${
                    isCurrent
                      ? 'border-primary-300/70 bg-[rgba(186,207,214,0.32)]'
                      : isPast
                        ? 'border-emerald-300/50 bg-[rgba(209,229,218,0.52)]'
                        : 'app-input-shell'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isCurrent
                          ? 'app-pill'
                          : isPast
                            ? 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
                            : 'app-pill-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-800 text-sm leading-6 break-words">
                        {label.trim() ? label : 'Brak opisu dla tego etapu.'}
                      </p>
                      <p className="text-surface-500 mt-1 text-xs">
                        {isCurrent
                          ? 'Aktualnie aktywny etap.'
                          : isPast
                            ? 'Ten etap został już osiągnięty.'
                            : 'Etap jeszcze przed Wami.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
