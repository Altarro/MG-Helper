import { memo } from 'react';
import type { ClockSegments } from '../types';

interface ClockVisualProps {
  segments: ClockSegments;
  filled: number;
  /** px — diameter of the SVG circle. Default 120 */
  size?: number;
  /** Called with the new filled count when a segment is clicked */
  onTick?: (newFilled: number) => void;
  className?: string;
}

/**
 * SVG pie-chart style PbtA clock.
 * Segments are drawn as arc paths from the top (12 o'clock), going clockwise.
 */
export const ClockVisual = memo(function ClockVisual({
  segments,
  filled,
  size = 120,
  onTick,
  className = '',
}: ClockVisualProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4; // small gap for the border
  const interactive = Boolean(onTick);

  /**
   * Returns the SVG path for a single pie segment.
   * segIndex is 0-based, counted from the top clockwise.
   */
  function segmentPath(segIndex: number): string {
    const angleStep = (2 * Math.PI) / segments;
    // start from top (−π/2) going clockwise
    const startAngle = -Math.PI / 2 + segIndex * angleStep;
    const endAngle = startAngle + angleStep;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = angleStep > Math.PI ? 1 : 0;

    return [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');
  }

  function handleClick(segIndex: number) {
    if (!onTick) return;
    // Clicking a filled segment at the boundary unfills it (reset one step)
    // Clicking the next unfilled segment fills it (tick)
    if (segIndex === filled - 1) {
      onTick(filled - 1); // un-tick last segment
    } else if (segIndex === filled) {
      onTick(filled + 1); // tick next segment
    }
    // clicking other segments is a no-op
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Zegar: ${filled} z ${segments} segmentów wypełnionych`}
      role={interactive ? 'group' : 'img'}
      className={className}
    >
      {Array.from({ length: segments }, (_, i) => {
        const isFilled = i < filled;
        const isClickable = interactive && (i === filled || i === filled - 1);

        return (
          <path
            key={i}
            d={segmentPath(i)}
            fill={isFilled ? 'var(--color-primary-600, #4f46e5)' : 'var(--color-surface-100, #f1f5f9)'}
            stroke="white"
            strokeWidth={2}
            style={{
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'fill 0.15s ease',
            }}
            onClick={() => handleClick(i)}
            role={isClickable ? 'button' : undefined}
            aria-label={
              isClickable
                ? i === filled
                  ? `Wypełnij segment ${i + 1}`
                  : `Cofnij segment ${i}`
                : undefined
            }
          />
        );
      })}
      {/* Center cap */}
      <circle cx={cx} cy={cy} r={size * 0.12} fill="white" />
    </svg>
  );
});
