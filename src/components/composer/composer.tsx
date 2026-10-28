"use client";
import * as React from "react";
import { ArrowUp, Square, Paperclip, Mic, MicOff, X, Hammer, ListChecks, MessageCircle, ChevronDown, MousePointerClick, Check } from "lucide-react";
import { Menu } from "@/components/ui/menu";
import { ModelPicker } from "./model-picker";
import { fileToImage } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type { ModelChoice } from "@/lib/hooks";
import type { Mode, SelectedElement } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface DraftImage {
  name: string;
  mediaType: string;
  data: string;
  preview: string;
}

export const MODES: { value: Mode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "build", label: "Build", icon: <Hammer />, description: "Make changes to your app" },
  { value: "plan", label: "Plan", icon: <ListChecks />, description: "Investigate and propose a plan first. No code changes." },
  { value: "chat", label: "Chat", icon: <MessageCircle />, description: "Ask questions and debug. No code changes." },
];

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  mode,
  onModeChange,
  model,
  onModelChange,
  images,
  onImagesChange,
  selected,
  onClearSelected,
  placeholder,
  variant = "chat",
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  model: ModelChoice | null;
  onModelChange: (c: ModelChoice) => void;
  images: DraftImage[];
  onImagesChange: (imgs: DraftImage[]) => void;
  selected?: SelectedElement | null;
  onClearSelected?: () => void;
  placeholder?: string;
  variant?: "hero" | "chat";
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recog = React.useRef<SpeechRecognitionLike | null>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, variant === "hero" ? 320 : 240)}px`;
  }, [value, variant]);

  const addFiles = async (files: FileList | File[]) => {
    const next = [...images];
    for (const f of Array.from(files)) {
      if (next.length >= 10) break;
      try {
        next.push(await fileToImage(f));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not attach file");
      }
    }
    onImagesChange(next);
  };

  const canSend = !disabled && !busy && value.trim().length > 0 && !!model;
  const submit = () => canSend && onSubmit();

  const toggleVoice = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return toast.error("Voice input is not supported in this browser");
    if (listening) {
      recog.current?.stop();
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = false;
    const base = value ? `${value} ` : "";
    let said = "";
    r.onresult = (e) => {
      said = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>)
        .map((res) => res[0].transcript)
        .join(" ");
      onChange(base + said);
    };
    r.onend = () => setListening(false);
    recog.current = r;
    r.start();
    setListening(true);
  };

  const currentMode = MODES.find((m) => m.value === mode)!;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-2xl border border-border bg-elevated shadow-card transition-colors focus-within:border-border-strong",
        dragging && "border-accent ring-2 ring-accent/20",
        variant === "hero" && "rounded-3xl",
      )}
    >
      {selected && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs">
          <MousePointerClick className="size-3.5 text-accent" />
          <span className="text-fg-muted">Editing</span>
          <code className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-accent">&lt;{selected.tag}&gt;</code>
          <span className="flex-1 truncate text-fg-subtle">{selected.text.slice(0, 60)}</span>
          <button onClick={onClearSelected} className="rounded p-0.5 text-fg-subtle hover:bg-muted hover:text-fg" aria-label="Clear selection">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {images.map((img, i) => (
            <div key={i} className="group relative size-14 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={img.name} className="size-full object-cover" />
              <button
                onClick={() => onImagesChange(images.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (files.length) {
            e.preventDefault();
            addFiles(files);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={variant === "hero" ? 3 : 2}
        placeholder={placeholder ?? (mode === "build" ? "Ask Doable to build or change something…" : mode === "plan" ? "Describe what you want; Doable will plan it…" : "Ask a question about your app…")}
        className={cn(
          "scrollbar-thin block w-full resize-none bg-transparent px-4 pt-3.5 text-fg outline-none placeholder:text-fg-subtle",
          variant === "hero" ? "min-h-24 text-[16px]" : "min-h-14 text-sm",
        )}
      />
      <div className="flex items-center gap-1 px-2 pt-1 pb-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach images (or paste / drop them)"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg"
        >
          <Paperclip className="size-4" />
        </button>
        <Menu
          side={variant === "hero" ? "bottom" : "top"}
          className="w-72"
          trigger={
            <button type="button" className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[13px] text-fg-muted hover:bg-muted hover:text-fg [&_svg]:size-3.5">
              {currentMode.icon}
              {currentMode.label}
              <ChevronDown className="size-3.5" />
            </button>
          }
        >
          {(close) =>
            MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  onModeChange(m.value);
                  close();
                }}
                className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-fg-muted"
              >
                {m.icon}
                <span className="flex-1">
                  <span className="block text-[13px] font-medium text-fg">{m.label}</span>
                  <span className="block text-xs text-fg-subtle">{m.description}</span>
                </span>
                {m.value === mode && <Check className="!text-accent" />}
              </button>
            ))
          }
        </Menu>
        <ModelPicker value={model} onChange={onModelChange} side={variant === "hero" ? "bottom" : "top"} />
        <div className="flex-1" />
        <button
          type="button"
          onClick={toggleVoice}
          title={listening ? "Stop dictation" : "Dictate"}
          className={cn(
            "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg",
            listening && "bg-danger/10 text-danger",
          )}
        >
          {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            title="Stop"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-fg text-bg hover:opacity-90"
          >
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            title="Send (Enter)"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-fg text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
