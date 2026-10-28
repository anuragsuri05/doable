"use client";
import * as React from "react";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronRight,
  FilePlus2,
  FileText,
  FileEdit,
  FileX2,
  FolderTree,
  Package,
  RotateCcw,
  Search,
  Terminal,
  Tag,
  Loader2,
  ListChecks,
  Hammer,
  MessageCircle,
  Copy,
  RefreshCw,
  ArrowRightLeft,
  X,
  ShieldCheck,
} from "lucide-react";
import { Markdown } from "./markdown";
import { ProviderIcon } from "@/components/composer/provider-icon";
import { formatCost, formatTokens } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type { ChatMessage, MessagePart } from "@/lib/types";
import { cn } from "@/lib/cn";

type ToolPart = Extract<MessagePart, { type: "tool" }>;

const TOOL_META: Record<string, { icon: React.ComponentType<{ className?: string }>; verb: string; past: string }> = {
  list_files: { icon: FolderTree, verb: "Listing files", past: "Listed files" },
  read_file: { icon: FileText, verb: "Reading", past: "Read" },
  write_file: { icon: FilePlus2, verb: "Writing", past: "Wrote" },
  edit_file: { icon: FileEdit, verb: "Editing", past: "Edited" },
  delete_file: { icon: FileX2, verb: "Deleting", past: "Deleted" },
  rename_file: { icon: ArrowRightLeft, verb: "Renaming", past: "Renamed" },
  search_files: { icon: Search, verb: "Searching", past: "Searched" },
  add_dependencies: { icon: Package, verb: "Installing", past: "Installed" },
  read_console_logs: { icon: Terminal, verb: "Reading console logs", past: "Read console logs" },
  rename_project: { icon: Tag, verb: "Naming project", past: "Named project" },
  check_app: { icon: ShieldCheck, verb: "Checking for errors", past: "Checked app" },
};

function toolLabel(p: ToolPart) {
  const v = p.input.path ?? p.input.from ?? p.input.pattern ?? p.input.name ?? (Array.isArray(p.input.packages) ? (p.input.packages as string[]).join(", ") : "");
  return typeof v === "string" ? v : "";
}

function ToolRow({ part }: { part: ToolPart }) {
  const meta = TOOL_META[part.name] ?? { icon: Terminal, verb: part.name, past: part.name };
  const Icon = meta.icon;
  const label = toolLabel(part);
  return (
    <div className="flex items-center gap-2 py-1 text-[13px]">
      {part.status === "running" ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" />
      ) : part.status === "error" ? (
        <X className="size-3.5 shrink-0 text-danger" />
      ) : (
        <Icon className="size-3.5 shrink-0 text-fg-subtle" />
      )}
      <span className={cn("shrink-0", part.status === "running" ? "shimmer-text" : "text-fg-muted")}>
        {part.status === "running" ? meta.verb : meta.past}
      </span>
      {label && <code className="truncate font-mono text-xs text-fg">{label}</code>}
      {part.status === "error" && part.summary && <span className="truncate text-xs text-danger">{part.summary}</span>}
    </div>
  );
}

/** Groups consecutive tool calls into one collapsible "N actions" card, like Lovable's activity cards. */
function ToolGroup({ parts, live }: { parts: ToolPart[]; live: boolean }) {
  const running = parts.some((p) => p.status === "running");
  const [open, setOpen] = React.useState(false);
  const expanded = open || running;
  const edits = parts.filter((p) => ["write_file", "edit_file", "delete_file", "rename_file"].includes(p.name)).length;
  const shown = expanded ? parts : parts.slice(-1);
  return (
    <div className="my-2 rounded-xl border border-border bg-subtle/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-fg-muted hover:text-fg"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        {running && live ? <span className="shimmer-text font-medium">Working…</span> : <span className="font-medium">{parts.length} action{parts.length === 1 ? "" : "s"}</span>}
        {edits > 0 && <span className="text-fg-subtle">· {edits} file change{edits === 1 ? "" : "s"}</span>}
      </button>
      <div className="border-t border-border px-3 py-1">
        {shown.map((p) => (
          <ToolRow key={p.id} part={p} />
        ))}
      </div>
    </div>
  );
}

function Thinking({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="my-1.5">
      <button onClick={() => setOpen(!open)} className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-subtle hover:text-fg">
        <Brain className="size-3.5" />
        <span className={live ? "shimmer-text" : ""}>{live ? "Thinking…" : "Thought"}</span>
        <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
      </button>
      {open && text.trim() && <div className="mt-1.5 border-l-2 border-border pl-3 text-xs whitespace-pre-wrap text-fg-muted">{text}</div>}
    </div>
  );
}

export function AssistantParts({ parts, live }: { parts: MessagePart[]; live: boolean }) {
  // Merge consecutive tool parts into groups.
  const blocks: ({ kind: "tools"; parts: ToolPart[] } | { kind: "part"; part: MessagePart })[] = [];
  for (const p of parts) {
    const last = blocks[blocks.length - 1];
    if (p.type === "tool") {
      if (last?.kind === "tools") last.parts.push(p);
      else blocks.push({ kind: "tools", parts: [p] });
    } else blocks.push({ kind: "part", part: p });
  }
  return (
    <>
      {blocks.map((b, i) => {
        const isLast = i === blocks.length - 1;
        if (b.kind === "tools") return <ToolGroup key={i} parts={b.parts} live={live} />;
        if (b.part.type === "thinking") return <Thinking key={i} text={b.part.text} live={live && isLast} />;
        if (b.part.type === "text") return <Markdown key={i}>{b.part.text}</Markdown>;
        return null;
      })}
    </>
  );
}

const MODE_ICON = { build: Hammer, plan: ListChecks, chat: MessageCircle };

export function MessageView({
  message,
  live,
  isLatestAssistant,
  isCurrentVersion,
  onRestore,
  onApprovePlan,
  onImplement,
  onRetry,
}: {
  message: ChatMessage;
  live?: boolean;
  isLatestAssistant?: boolean;
  isCurrentVersion?: boolean;
  onRestore?: (sha: string) => void;
  onApprovePlan?: (m: ChatMessage) => void;
  onImplement?: (m: ChatMessage) => void;
  onRetry?: () => void;
}) {
  if (message.role === "user") {
    const ModeIcon = MODE_ICON[message.mode] ?? Hammer;
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {message.attachments.map((a, i) =>
              a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={a.url} alt={a.name} className="size-20 rounded-lg border border-border object-cover" />
              ) : null,
            )}
          </div>
        )}
        <div className="max-w-[90%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 text-[14px] whitespace-pre-wrap text-fg">{message.content}</div>
        {message.mode !== "build" && (
          <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
            <ModeIcon className="size-3" /> {message.mode === "plan" ? "Plan mode" : "Chat mode"}
          </span>
        )}
      </div>
    );
  }

  const streaming = live || message.status === "streaming";
  const done = !streaming;
  return (
    <div className="group">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-fg-subtle">
        {message.provider && <ProviderIcon provider={message.provider} className="size-3.5" />}
        <span className="font-medium text-fg-muted">Doable</span>
        {message.model && <span>· {message.model}</span>}
      </div>
      {message.parts.length === 0 && streaming && <div className="shimmer-text text-sm">Thinking…</div>}
      <AssistantParts parts={message.parts} live={streaming} />
      {message.status === "error" && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13px] text-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <div className="flex-1">
            <div>{message.error}</div>
            {onRetry && isLatestAssistant && (
              <button onClick={onRetry} className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-accent hover:underline">
                <RefreshCw className="size-3" /> Try again
              </button>
            )}
          </div>
        </div>
      )}
      {message.status === "stopped" && <div className="mt-2 text-xs text-fg-subtle">Stopped.</div>}
      {done && message.mode === "plan" && message.status === "done" && isLatestAssistant && onApprovePlan && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/50 p-3">
          <ListChecks className="size-4 text-accent" />
          <span className="flex-1 text-[13px] text-fg">Ready to build this plan?</span>
          <button
            onClick={() => onApprovePlan(message)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-fg hover:opacity-90"
          >
            <Check className="size-3.5" /> Approve & build
          </button>
        </div>
      )}
      {done && message.mode === "chat" && message.status === "done" && isLatestAssistant && onImplement && (
        <button
          onClick={() => onImplement(message)}
          className="mt-2 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs text-fg-muted hover:bg-muted hover:text-fg"
        >
          <Hammer className="size-3.5" /> Implement this
        </button>
      )}
      {done && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">
          {message.commitSha &&
            (isCurrentVersion ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5">Current version</span>
            ) : (
              <button
                onClick={() => onRestore?.(message.commitSha!)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-fg"
                title="Restore the app to this version"
              >
                <RotateCcw className="size-3" /> Restore
              </button>
            ))}
          <button
            onClick={() => {
              navigator.clipboard.writeText(message.content);
              toast.success("Copied");
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-fg"
          >
            <Copy className="size-3" /> Copy
          </button>
          {(message.inputTokens > 0 || message.outputTokens > 0) && (
            <span className="ml-auto" title={`${message.inputTokens} input / ${message.outputTokens} output tokens`}>
              {formatTokens(message.inputTokens + message.outputTokens)} tokens{message.costUsd > 0 && ` · ~${formatCost(message.costUsd)}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
