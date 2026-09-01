import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UserService } from '@/services/UserService';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warnKey: string;
  title: string;
  description?: string;
  linkedSummary?: string;
  recoverable?: boolean;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

const ConfirmDeleteDialog = ({
  open,
  onOpenChange,
  warnKey,
  title,
  description,
  linkedSummary,
  recoverable = true,
  confirmLabel = 'Delete',
  onConfirm,
}: ConfirmDeleteDialogProps) => {
  const [dontAsk, setDontAsk] = useState(false);

  const handleConfirm = async () => {
    if (dontAsk) UserService.muteDeleteWarning(warnKey);
    await onConfirm();
    setDontAsk(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {linkedSummary && (
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {linkedSummary}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {recoverable
            ? 'You can restore it from Recently Deleted within 30 days.'
            : "This can't be undone."}
        </p>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox checked={dontAsk} onCheckedChange={(v) => setDontAsk(v === true)} />
          Don't ask me again for this
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDeleteDialog;
