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
        <p className="mt-1 text-sm text-surface-500">{description}</p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
            destructive
              ? 'bg-danger-600 hover:bg-danger-700'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

