import { createPortal } from 'react-dom';

interface BackdropProps {
  onClose: () => void;
  /** Tailwind opacity class, e.g. 'bg-black/40'. Defaults to 'bg-black/40'. */
  opacity?: string;
  zIndex?: number;
}

export function Backdrop({ onClose, opacity = 'bg-black/40', zIndex = 40 }: BackdropProps) {
  return createPortal(
    <div
      className={`fixed inset-0 ${opacity}`}
      style={{ zIndex }}
      aria-hidden="true"
      onMouseDown={onClose}
      onTouchStart={onClose}
      onClick={onClose}
    />,
    document.body,
  );
}
