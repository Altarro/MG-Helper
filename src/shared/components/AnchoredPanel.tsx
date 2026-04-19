import { useState, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Backdrop } from './Backdrop';

export type AnchoredPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

interface AnchoredPanelProps {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  placement?: AnchoredPlacement;
}

interface Position {
  top: number;
  left: number;
}

function computePosition(
  anchor: HTMLElement,
  panel: HTMLElement,
  placement: AnchoredPlacement,
): Position {
  const rect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 4;

  let top: number;
  let left: number;

  const isBottom = placement.startsWith('bottom');
  const isStart = placement.endsWith('start');

  // Vertical
  if (isBottom) {
    top = rect.bottom + GAP;
    // Flip to top if panel overflows viewport
    if (top + panelRect.height > vh && rect.top - GAP - panelRect.height >= 0) {
      top = rect.top - GAP - panelRect.height;
    }
  } else {
    top = rect.top - GAP - panelRect.height;
    // Flip to bottom if panel overflows viewport
    if (top < 0 && rect.bottom + GAP + panelRect.height <= vh) {
      top = rect.bottom + GAP;
    }
  }

  // Horizontal
  if (isStart) {
    left = rect.left;
    if (left + panelRect.width > vw) {
      left = rect.right - panelRect.width;
    }
  } else {
    left = rect.right - panelRect.width;
    if (left < 0) {
      left = rect.left;
    }
  }

  // Clamp to viewport
  top = Math.max(8, Math.min(top, vh - panelRect.height - 8));
  left = Math.max(8, Math.min(left, vw - panelRect.width - 8));

  return { top, left };
}

export function AnchoredPanel({
  anchorRef,
  onClose,
  children,
  placement = 'bottom-start',
}: AnchoredPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position | null>(null);

  // Calculate position after panel renders (so we know its size)
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    setPos(computePosition(anchor, panel, placement));
  }, [anchorRef, placement]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Recalculate on scroll / resize
  useEffect(() => {
    function recalc() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      setPos(computePosition(anchor, panel, placement));
    }
    window.addEventListener('resize', recalc, { passive: true });
    window.addEventListener('scroll', recalc, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [anchorRef, placement]);

  return createPortal(
    <>
      <Backdrop onClose={onClose} opacity="bg-black/20" zIndex={40} />
      <div
        ref={panelRef}
        className="fixed z-50"
        style={
          pos
            ? { top: pos.top, left: pos.left }
            : { top: 0, left: 0, visibility: 'hidden' }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
