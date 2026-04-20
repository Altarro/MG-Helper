import { useRef } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Usuń',
  cancelLabel = 'Anuluj',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!open) return null;

  return (
    <Modal title={title} size="sm" onClose={onCancel} initialFocusRef={cancelRef}>
      {description && (
        <p className="mt-1 text-sm leading-7 text-surface-700">{description}</p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
            destructive
              ? 'bg-danger-600 text-white hover:bg-danger-700'
              : 'app-button-primary'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
