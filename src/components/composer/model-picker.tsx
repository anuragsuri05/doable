"use client";
import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, KeyRound, RefreshCw, Search } from "lucide-react";
import { Menu, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { ProviderIcon, PROVIDER_LABEL } from "./provider-icon";
import { useModels, type ModelChoice } from "@/lib/hooks";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ModelPicker({ value, onChange, side = "bottom" }: { value: ModelChoice | null; onChange: (c: ModelChoice) => void; side?: "top" | "bottom" }) {
  const { data, refresh } = useModels();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const current = value && data?.[value.provider]?.models.find((m) => m.id === value.model);
  const order: Provider[] = ["anthropic", "openai", "google"];

  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      side={side}
      className="w-80"
      trigger={
        <button type="button" className="inline-flex h-8 max-w-52 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[13px] text-fg-muted hover:bg-muted hover:text-fg">
          {value && <ProviderIcon provider={value.provider} className="size-3.5" />}
          <span className="truncate">{current?.name ?? value?.model ?? "Choose model"}</span>
          <ChevronDown className="size-3.5 shrink-0" />
        </button>
      }
    >
      <div className="flex items-center gap-2 border-b border-border px-2 pb-1.5">
        <Search className="size-3.5 text-fg-subtle" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search models…"
          className="h-7 flex-1 bg-transparent text-[13px] outline-none placeholder:text-fg-subtle"
        />
        <button onClick={refresh} title="Refresh model lists" className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg">
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      <div className="scrollbar-thin max-h-96 overflow-y-auto py-1">
        {!data && <div className="px-3 py-4 text-center text-xs text-fg-subtle">Loading models…</div>}
        {data &&
          order.map((p, i) => {
            const entry = data[p];
            const models = entry.models.filter((m) => !q || `${m.name} ${m.id}`.toLowerCase().includes(q.toLowerCase()));
            return (
              <div key={p}>
                {i > 0 && <MenuSeparator />}
                <MenuLabel>
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 normal-case">
                      <ProviderIcon provider={p} className="size-3" /> {PROVIDER_LABEL[p]}
                    </span>
                    {entry.available && (
                      <span className="text-[10px] normal-case">{entry.source === "user" ? "your key" : "platform key"}</span>
                    )}
                  </span>
                </MenuLabel>
                {!entry.available ? (
                  <Link
                    href="/settings?tab=providers"
                    className="mx-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-accent hover:bg-muted"
                  >
                    <KeyRound className="size-3.5" /> Connect your {PROVIDER_LABEL[p]} key
                  </Link>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {models.slice(0, q ? 50 : 12).map((m) => {
                      const active = value?.provider === p && value.model === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            onChange({ provider: p, model: m.id });
                            setOpen(false);
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-muted",
                            active && "bg-muted",
                          )}
                        >
                          <span className="flex-1 truncate">
                            {m.name}
                            {m.recommended && <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] text-accent">recommended</span>}
                          </span>
                          {m.inputPrice != null && (
                            <span className="text-[10px] text-fg-subtle">
                              ${m.inputPrice}/${m.outputPrice}
                            </span>
                          )}
                          {active && <Check className="size-3.5 text-accent" />}
                        </button>
                      );
                    })}
                    {entry.error && <div className="px-2.5 py-1 text-[11px] text-warning">Could not load live list: {entry.error}</div>}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </Menu>
  );
}
