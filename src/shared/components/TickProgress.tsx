interface TickProgressProps {
  tickLabels: string[];
  filled: number;
  segments: number;
  className?: string;
  /**
   * W kartach: „Teraz:” w ciemnym tonie; „Następnie:” stonowane, ciaśniejsza interlinia i mniejszy krój niż „Teraz”.
   */
  uniformCaption?: boolean;
}

/**
 * Displays the current tick label (bold) and next tick label (muted/italic)
 * based on how many segments are filled.
 */
export function TickProgress({
  tickLabels,
  filled,
  segments,
  className = '',
  uniformCaption = false,
}: TickProgressProps) {
  if (!tickLabels || tickLabels.length === 0) return null;

  const hasCurrentTick = filled > 0;
  const currentIndex = filled - 1;
  const nextIndex = filled;

  const currentLabel = hasCurrentTick ? tickLabels[currentIndex] ?? null : null;
  const nextLabel = filled < segments ? tickLabels[nextIndex] ?? null : null;

  if (!currentLabel && !nextLabel) return null;

  if (uniformCaption) {
    return (
      <div className={`flex flex-col gap-0 ${className}`}>
        {currentLabel && (
          <p className="text-[13px] leading-tight font-semibold text-surface-900">
            Teraz: {currentLabel}
          </p>
        )}
        {nextLabel && (
          <p className="text-[11px] leading-tight italic text-surface-400 [&:not(:first-child)]:mt-0.5">
            <span className="not-italic">Następnie: </span>
            {nextLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {currentLabel && (
        <p className="text-xs font-semibold text-surface-800">
          <span className="text-surface-400 font-normal">Teraz: </span>
          {currentLabel}
        </p>
      )}
      {nextLabel && (
        <p className="text-xs italic text-surface-400">
          <span className="not-italic">Następnie: </span>
          {nextLabel}
        </p>
      )}
    </div>
  );
}
