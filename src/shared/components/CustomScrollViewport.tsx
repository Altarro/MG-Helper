import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type MouseEventHandler } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface CustomScrollViewportProps {
  /** Wysokość widoku przewijania (np. `calc(1.5rem * 5)` lub `min(22rem, …)`) */
  maxHeight: string;
  children: ReactNode;
  /** Dodatkowe klasy na wewnętrznym kontenerze z `overflow-y-auto` (ukryty pasek systemowy) */
  contentClassName?: string;
  remeasureKey?: string | number;
  onViewportMouseDown?: MouseEventHandler<HTMLDivElement>;
  className?: string;
}

/**
 * Przewijanie z ukrytym paskiem przewijania systemu i wąską „szyną” jak w {@link CardScrollBlock}.
 */
export function CustomScrollViewport({
  maxHeight,
  children,
  contentClassName = '',
  remeasureKey,
  onViewportMouseDown,
  className = '',
}: CustomScrollViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const [thumb, setThumb] = useState({ topPct: 0, heightPct: 100 });

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasOverflow = scrollHeight > clientHeight + 1;
    setOverflow(hasOverflow);
    if (!hasOverflow) {
      setCanUp(false);
      setCanDown(false);
      setThumb({ topPct: 0, heightPct: 100 });
      return;
    }
    setCanUp(scrollTop > 2);
    setCanDown(scrollTop < scrollHeight - clientHeight - 2);
    const range = scrollHeight - clientHeight;
    const heightPct = Math.min(100, Math.max(12, (clientHeight / scrollHeight) * 100));
    const topPct = range <= 0 ? 0 : (scrollTop / range) * (100 - heightPct);
    setThumb({ topPct, heightPct });
  }, []);

  useLayoutEffect(() => {
    update();
    const inner = innerRef.current;
    if (!inner) return;
    const ro = new ResizeObserver(() => update());
    ro.observe(inner);
    return () => ro.disconnect();
  }, [update, remeasureKey, maxHeight]);

  return (
    <div className={`flex min-w-0 gap-2 ${className}`.trim()}>
      <div
        ref={scrollRef}
        onScroll={update}
        onMouseDown={onViewportMouseDown}
        style={{ maxHeight }}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${contentClassName}`.trim()}
      >
        <div ref={innerRef} className="min-w-0">
          {children}
        </div>
      </div>
      {overflow && (
        <div
          className="flex w-4 shrink-0 flex-col items-center py-0.5"
          style={{ height: maxHeight }}
          aria-hidden
        >
          <ChevronUp
            className={`h-3 w-3 shrink-0 text-surface-400 transition-opacity ${
              canUp ? 'opacity-70' : 'opacity-[0.22]'
            }`}
          />
          <div className="relative my-1 min-h-0 w-1 flex-1 rounded-full bg-[rgba(210,212,203,0.88)]">
            <div
              className="absolute left-0 w-full rounded-full bg-[rgba(33,71,102,0.26)] transition-[top,height] duration-75"
              style={{
                height: `${thumb.heightPct}%`,
                top: `${thumb.topPct}%`,
              }}
            />
          </div>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-surface-400 transition-opacity ${
              canDown ? 'opacity-70' : 'opacity-[0.22]'
            }`}
          />
        </div>
      )}
    </div>
  );
}
