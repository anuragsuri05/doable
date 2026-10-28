"use client";
import * as React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
let push: ((t: Omit<Toast, "id">) => void) | null = null;

export const toast = {
  success: (message: string) => push?.({ kind: "success", message }),
  error: (message: string) => push?.({ kind: "error", message }),
  info: (message: string) => push?.({ kind: "info", message }),
};

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);
  React.useEffect(() => {
    let n = 0;
    push = (t) => {
      const id = ++n;
      setItems((xs) => [...xs, { ...t, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.kind === "error" ? 6000 : 3500);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-sm text-fg shadow-xl"
        >
          {t.kind === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
          {t.kind === "error" && <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
          {t.kind === "info" && <Info className="mt-0.5 size-4 shrink-0 text-accent" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
