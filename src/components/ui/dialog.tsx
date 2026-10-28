"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-elevated shadow-2xl", className)}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div>
              {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="scrollbar-thin overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
