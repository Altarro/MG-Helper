import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Backdrop } from './Backdrop';

const SIZE_CLASSES = {
  sm: 'w-full max-w-sm',
  md: 'w-full max-w-[32rem]',
  lg: 'w-full max-w-[44rem]',
  xl: 'w-full max-w-5xl',
} as const;

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: keyof typeof SIZE_CLASSES;
  initialFocusRef?: RefObject<HTMLElement | null>;
  'aria-label'?: string;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('aria-hidden'));
}

export function Modal({
  onClose,
  children,
  title,
  size = 'md',
  initialFocusRef,
  'aria-label': ariaLabel,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (e.shiftKey) {
        if (active === first || active === panel) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useLayoutEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const el = panelRef.current;
    if (!el) return;
    const preferredFocus = initialFocusRef?.current;
    const autofocusTarget = el.querySelector<HTMLElement>('[autofocus]');
    const formControlTarget = el.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
    );
    const firstFocusable = getFocusableElements(el)[0];

    (preferredFocus ?? autofocusTarget ?? formControlTarget ?? firstFocusable ?? el).focus();

    return () => {
      if (restoreFocusRef.current?.isConnected) {
        restoreFocusRef.current.focus();
      }
    };
  }, [initialFocusRef]);

  return createPortal(
    <>
      <Backdrop onClose={onClose} opacity="bg-black/40" zIndex={40} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`app-panel-strong relative ${SIZE_CLASSES[size]} max-h-[90vh] overflow-visible rounded-[1.75rem] shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {title !== undefined && (
            <>
              <div className="flex items-center justify-between border-b border-[rgba(86,93,94,0.14)] px-5 py-4">
                <h2
                  id={titleId}
                  className="text-primary-900 text-sm font-semibold tracking-[-0.02em]"
                >
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Zamknij"
                  className="app-button-secondary rounded-xl p-2 text-surface-500 transition-colors hover:text-primary-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[calc(90vh-4.5rem)] overflow-y-auto p-5 lg:p-6">{children}</div>
            </>
          )}
          {title === undefined && <div className="max-h-[90vh] overflow-y-auto">{children}</div>}
        </div>
      </div>
    </>,
    document.body,
  );
}
