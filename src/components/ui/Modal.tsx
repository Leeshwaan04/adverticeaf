"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Tailwind max-width class for the dialog panel. */
  maxWidth?: string;
}

/**
 * Accessible modal built on the native <dialog> element. showModal() gives us,
 * for free: a focus trap, Escape to close, inert background content, and focus
 * returning to the trigger on close. Children mount only while open so form
 * state resets every time.
 */
export default function Modal({ open, onClose, title, description, children, maxWidth = "max-w-lg" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Land on the first form control (if any) instead of the close button.
      dialog.querySelector<HTMLElement>("input:not([tabindex='-1']), select, textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is a backdrop click.
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${maxWidth} max-h-[92dvh] overflow-hidden rounded-2xl border border-line-strong bg-surface p-0 text-fg shadow-2xl shadow-black/60`}
    >
      {open && (
        <div className="max-h-[92dvh] overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-2xl font-bold tracking-tight text-fg">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1.5 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-2 -mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-fg"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
