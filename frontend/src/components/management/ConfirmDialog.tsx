import { Button } from "@/components/ui";

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  icon = "⚠️",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-card border border-line bg-surface p-7"
        style={{ boxShadow: "var(--sh-lg)" }}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--clr-danger-dim)]">
          <span className="text-2xl">{icon}</span>
        </div>
        <h2 className="font-display text-lg font-semibold text-[var(--clr-text)]">{title}</h2>
        <div className="mt-2 text-sm text-[var(--clr-text-2)]">{message}</div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[var(--clr-danger)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
