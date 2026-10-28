import type { Provider } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ProviderIcon({ provider, className }: { provider: Provider; className?: string }) {
  if (provider === "anthropic")
    return (
      <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-label="Claude">
        <path
          fill="#D97757"
          d="M12 2.5l1.6 6.1 5.6-3-3 5.6 6.1 1.6-6.1 1.6 3 5.6-5.6-3L12 22.5l-1.6-6.1-5.6 3 3-5.6-6.1-1.6 6.1-1.6-3-5.6 5.6 3z"
        />
      </svg>
    );
  if (provider === "openai")
    return (
      <svg viewBox="0 0 24 24" className={cn("size-4 text-fg", className)} aria-label="OpenAI">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-label="Gemini">
      <defs>
        <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4285F4" />
          <stop offset="1" stopColor="#9B72CB" />
        </linearGradient>
      </defs>
      <path fill="url(#gem)" d="M12 2c.6 5.3 4.7 9.4 10 10-5.3.6-9.4 4.7-10 10-.6-5.3-4.7-9.4-10-10 5.3-.6 9.4-4.7 10-10z" />
    </svg>
  );
}

export const PROVIDER_LABEL: Record<Provider, string> = { anthropic: "Claude", openai: "OpenAI", google: "Gemini" };
