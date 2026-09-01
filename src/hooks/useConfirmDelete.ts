import { useState, useCallback } from 'react';
import { UserService } from '@/services/UserService';

interface ConfirmDeleteState {
  open: boolean;
  pendingId: string | null;
  requestDelete: (id: string) => void;
  confirm: () => void | Promise<void>;
  cancel: () => void;
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warnKey: string;
    onConfirm: () => void | Promise<void>;
  };
}

/**
 * Shared hook for the confirm-before-delete pattern.
 * If the user has muted this warnKey, the delete runs immediately without a dialog.
 * Otherwise, the dialog opens and the caller passes `dialogProps` to <ConfirmDeleteDialog>.
 * The caller provides `onDelete(id)` which performs the actual soft-delete.
 */
export function useConfirmDelete(
  warnKey: string,
  onDelete: (id: string) => void | Promise<void>,
  extraDialogProps?: Record<string, unknown>,
): ConfirmDeleteState {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const requestDelete = useCallback(
    (id: string) => {
      if (!UserService.shouldWarnBeforeDelete(warnKey)) {
        void onDelete(id);
        return;
      }
      setPendingId(id);
      setOpen(true);
    },
    [warnKey, onDelete],
  );

  const confirm = useCallback(async () => {
    if (pendingId) await onDelete(pendingId);
    setPendingId(null);
    setOpen(false);
  }, [pendingId, onDelete]);

  const cancel = useCallback(() => {
    setPendingId(null);
    setOpen(false);
  }, []);

  return {
    open,
    pendingId,
    requestDelete,
    confirm,
    cancel,
    dialogProps: {
      open,
      onOpenChange: (o: boolean) => { if (!o) cancel(); },
      warnKey,
      onConfirm: confirm,
      ...extraDialogProps,
    },
  };
}
