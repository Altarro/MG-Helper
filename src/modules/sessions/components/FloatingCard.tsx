import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { X, GripVertical, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

const storageKey = (id: string) => `fcard-pos-${id}`;
let _zTop = 20;

interface Pos { x: number; y: number }

function loadPos(id: string, fx: number, fy: number): Pos {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (raw) return JSON.parse(raw) as Pos;
  } catch { /* ignore */ }
  return { x: fx, y: fy };
}

interface FloatingCardProps {
  id: string;
  title: string;
  badge?: ReactNode;
  linkPath?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  initialX?: number;
  initialY?: number;
}

export function FloatingCard({
  id, title, badge, linkPath, onClose, children,
  width = 272, initialX = 64, initialY = 80,
}: FloatingCardProps) {
  const [pos, setPos] = useState<Pos>(() => loadPos(id, initialX, initialY));
  const [z, setZ] = useState(() => ++_zTop);
  const drag = useRef<{ sx: number; sy: number; sl: number; st: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(id), JSON.stringify(pos)); }
    catch { /* storage full — ignore */ }
  }, [id, pos]);

  const onPtrDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, sl: posRef.current.x, st: posRef.current.y };
    setZ(++_zTop);
  }, []);

  const onPtrMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { sx, sy, sl, st } = drag.current;
    setPos({ x: Math.max(0, sl + e.clientX - sx), y: Math.max(0, st + e.clientY - sy) });
  }, []);

  const onPtrUp = useCallback(() => { drag.current = null; }, []);

  const bringToFront = useCallback(() => {
    setZ((cur) => cur < _zTop ? ++_zTop : cur);
  }, []);

  return (
    <div
      style={{ left: pos.x, top: pos.y, zIndex: z, width }}
      className="fixed flex flex-col rounded-xl border border-surface-200 bg-white shadow-lg"
      onPointerDown={bringToFront}
    >
      {/* Drag handle / header */}
      <div
        className="flex cursor-grab items-center gap-1.5 rounded-t-xl border-b border-surface-100 bg-surface-50 px-2 py-1.5 active:cursor-grabbing select-none"
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-surface-300" />
        {badge}
        <span className="flex-1 min-w-0 truncate text-xs font-semibold text-surface-700">{title}</span>
        {linkPath && (
          <Link
            to={linkPath}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-surface-400 hover:text-primary-600"
            aria-label="Otwórz szczegóły"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Zamknij"
          className="shrink-0 text-surface-400 hover:text-surface-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Body */}
      <div className="overflow-y-auto p-2.5 text-xs" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {children}
      </div>
    </div>
  );
}
