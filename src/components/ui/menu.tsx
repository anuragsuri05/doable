"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Minimal dropdown menu: a trigger + a floating panel positioned under it. */
export function Menu({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setUncontrolled(v));
  const anchor = React.useRef<HTMLSpanElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; minWidth: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const width = panel.current?.offsetWidth ?? 220;
    const height = panel.current?.offsetHeight ?? 0;
    let left = align === "end" ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const top = side === "top" ? r.top - height - 6 : r.bottom + 6;
    setPos({ top: Math.max(8, top), left, minWidth: r.width });
  }, [open, align, side]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panel.current?.contains(e.target as Node) || anchor.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  const close = () => setOpen(false);
  return (
    <>
      <span ref={anchor} className="inline-flex">
        {React.cloneElement(trigger, {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            trigger.props.onClick?.(e);
            setOpen(!open);
          },
        })}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panel}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, minWidth: Math.max(pos?.minWidth ?? 0, 180) }}
            className={cn("fixed z-[60] rounded-xl border border-border bg-elevated p-1 shadow-xl", className)}
            onClick={(e) => e.stopPropagation()}
          >
            {typeof children === "function" ? children(close) : children}
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  active,
  disabled,
  hint,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted",
        danger && "text-danger [&_svg]:text-danger",
        active && "bg-muted",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-fg-subtle uppercase">{children}</div>;
}
