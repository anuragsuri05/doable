"use client";
import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, Check, ExternalLink, KeyRound, Palette, SlidersHorizontal, User, Info, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge, Github, Segmented, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { ProviderIcon } from "@/components/composer/provider-icon";
import { api, formatCost, formatTokens } from "@/lib/api";
import { invalidateModels, resetMeCache, useMe, useTheme } from "@/lib/hooks";
import { PROVIDERS, type Provider } from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "providers" | "account" | "agent" | "integrations" | "usage" | "appearance";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "providers", label: "AI providers", icon: KeyRound },
  { id: "agent", label: "Agent", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Github },
  { id: "usage", label: "Usage", icon: BarChart3 },
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
];

function SettingsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "providers";
  const welcome = params.get("welcome") === "1";
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Settings</h1>
          {welcome && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft/60 p-4">
              <Sparkles className="mt-0.5 size-5 text-accent" />
              <div className="text-sm text-fg">
                <div className="font-medium">Welcome to Doable!</div>
                Connect at least one AI provider below. Your key is encrypted and only used for your own projects.
              </div>
            </div>
          )}
          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => router.replace(`/settings?tab=${t.id}`)}
                className={cn(
                  "-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13px] whitespace-nowrap text-fg-muted hover:text-fg",
                  tab === t.id && "border-fg text-fg",
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
          <div className="mt-8">
            {tab === "providers" && <ProvidersTab />}
            {tab === "agent" && <AgentTab />}
            {tab === "integrations" && <IntegrationsTab />}
            {tab === "usage" && <UsageTab />}
            {tab === "account" && <AccountTab />}
            {tab === "appearance" && <AppearanceTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}

interface KeyState {
  provider: Provider;
  connected: boolean;
  hint: string | null;
  connectedAt: number | null;
  platformAvailable: boolean;
}

function ProvidersTab() {
  const [state, setState] = React.useState<KeyState[] | null>(null);
  const load = React.useCallback(() => {
    api<{ providers: KeyState[] }>("/api/providers").then((r) => setState(r.providers));
  }, []);
  React.useEffect(load, [load]);
  if (!state) return <Spinner className="text-fg-subtle" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Doable builds with the model you choose. Connect your own API key for each provider. Keys are verified, encrypted at rest (AES-256-GCM), and only used for your requests. Pay the provider directly at their API rates.
      </p>
      {PROVIDERS.map((p) => (
        <ProviderCard key={p.id} info={p} state={state.find((s) => s.provider === p.id)!} onChanged={load} />
      ))}
      <div className="flex gap-3 rounded-2xl border border-border bg-subtle p-4 text-[13px] text-fg-muted">
        <Info className="mt-0.5 size-4 shrink-0" />
        <div>
          <span className="font-medium text-fg">About signing in with a Claude, ChatGPT or Gemini subscription.</span> Consumer chat plans (Claude Pro/Max, ChatGPT Plus/Pro, Gemini Advanced) can't be used by
          third-party apps: providers only let other apps call their models through developer API keys. Create a key in each provider's console. It takes about a minute, and
          new accounts usually get free trial credit.
        </div>
      </div>
    </div>
  );
}

function ProviderCard({ info, state, onChanged }: { info: (typeof PROVIDERS)[number]; state: KeyState; onChanged: () => void }) {
  const [key, setKey] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(!state.connected);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ modelCount: number }>("/api/providers", { method: "PUT", body: { provider: info.id, apiKey: key } });
      toast.success(`${info.name} connected · ${r.modelCount} models available`);
      setKey("");
      setEditing(false);
      invalidateModels();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save key");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-border bg-elevated p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-subtle">
          <ProviderIcon provider={info.id} className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            {info.name}
            {state.connected ? (
              <Badge tone="success">
                <Check className="size-3" /> Connected
              </Badge>
            ) : state.platformAvailable ? (
              <Badge tone="accent">Platform key available</Badge>
            ) : (
              <Badge>Not connected</Badge>
            )}
          </div>
          <div className="text-xs text-fg-subtle">
            {state.connected ? (
              <>
                Key <code className="font-mono">{state.hint}</code>
              </>
            ) : state.platformAvailable ? (
              "You can build with the platform's key, or add your own to use your account."
            ) : (
              "Add an API key to build with these models."
            )}
          </div>
        </div>
        <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
          Get a key <ExternalLink className="size-3" />
        </a>
      </div>
      {editing ? (
        <div className="mt-4 flex gap-2">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && key && save()}
            placeholder={info.keyPrefix ? `${info.keyPrefix}…` : "Paste your API key"}
            className="font-mono text-[13px]"
            autoComplete="off"
          />
          <Button onClick={save} loading={busy} disabled={key.length < 8}>
            Verify & save
          </Button>
          {state.connected && (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Replace key
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            onClick={async () => {
              if (!confirm(`Disconnect ${info.name}?`)) return;
              await api(`/api/providers?provider=${info.id}`, { method: "DELETE" });
              invalidateModels();
              onChanged();
            }}
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}

function AgentTab() {
  const [settings, setSettings] = React.useState<{ effort?: string; maxSteps?: number } | null>(null);
  React.useEffect(() => {
    api<{ settings: { effort?: string; maxSteps?: number } }>("/api/settings").then((r) => setSettings(r.settings));
  }, []);
  if (!settings) return <Spinner className="text-fg-subtle" />;
  const patch = async (p: Record<string, unknown>) => {
    const r = await api<{ settings: typeof settings }>("/api/settings", { method: "PATCH", body: p });
    setSettings(r.settings);
    toast.success("Saved");
  };
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-elevated p-5">
        <div className="text-sm font-medium text-fg">Reasoning effort</div>
        <p className="mt-1 text-xs text-fg-muted">
          How hard Claude thinks before acting. Higher is smarter on complex changes but slower and uses more tokens. Applies to Claude models that support it.
        </p>
        <div className="mt-3">
          <Segmented
            value={(settings.effort as "medium") ?? "medium"}
            onChange={(v) => patch({ effort: v })}
            options={["low", "medium", "high", "xhigh", "max"].map((v) => ({ value: v as "medium", label: v }))}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-elevated p-5">
        <div className="text-sm font-medium text-fg">Max agent steps per message</div>
        <p className="mt-1 text-xs text-fg-muted">The agent stops after this many tool rounds. Raise it for big builds.</p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            min={5}
            max={200}
            defaultValue={settings.maxSteps ?? 80}
            className="w-28"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v >= 5 && v <= 200 && v !== settings.maxSteps) patch({ maxSteps: v });
            }}
          />
          <span className="text-xs text-fg-subtle">Default 80</span>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [gh, setGh] = React.useState<{ connected: boolean; hint: string | null } | null>(null);
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(() => {
    api<{ github: { connected: boolean; hint: string | null } }>("/api/providers").then((r) => setGh(r.github));
  }, []);
  React.useEffect(load, [load]);
  if (!gh) return <Spinner className="text-fg-subtle" />;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-elevated p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-subtle">
            <Github className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-fg">
              GitHub {gh.connected && <Badge tone="success">Connected</Badge>}
            </div>
            <div className="text-xs text-fg-subtle">Create repositories and push or pull project code.</div>
          </div>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Doable"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            Create a token <ExternalLink className="size-3" />
          </a>
        </div>
        {gh.connected ? (
          <div className="mt-4 flex items-center gap-2">
            <code className="rounded bg-subtle px-2 py-1 font-mono text-xs">{gh.hint}</code>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                await api(`/api/providers?provider=github`, { method: "DELETE" });
                load();
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_… (needs the repo scope)" className="font-mono text-[13px]" />
            <Button
              loading={busy}
              disabled={token.length < 10}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api<{ account: string }>("/api/providers", { method: "PUT", body: { provider: "github", apiKey: token } });
                  toast.success(`Connected as ${r.account}`);
                  setToken("");
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not connect");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Connect
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-elevated p-5 text-sm text-fg-muted">
        <span className="font-medium text-fg">Supabase</span> is connected per project: open a project → name menu → Secrets & Supabase.
      </div>
    </div>
  );
}

interface UsageData {
  byModel: { provider: Provider; model: string; source: string; runs: number; inputTokens: number; outputTokens: number; costUsd: number }[];
  byDay: { day: string; inputTokens: number; outputTokens: number; costUsd: number; runs: number }[];
  byProject: { name: string | null; projectId: string; runs: number; costUsd: number; tokens: number }[];
}

function UsageTab() {
  const [days, setDays] = React.useState<"7" | "30" | "90">("30");
  const [data, setData] = React.useState<UsageData | null>(null);
  React.useEffect(() => {
    setData(null);
    api<UsageData>(`/api/usage?days=${days}`).then(setData);
  }, [days]);
  const total = data?.byModel.reduce((a, r) => ({ cost: a.cost + r.costUsd, tokens: a.tokens + r.inputTokens + r.outputTokens, runs: a.runs + r.runs }), { cost: 0, tokens: 0, runs: 0 });
  const maxTokens = Math.max(1, ...(data?.byDay.map((d) => d.inputTokens + d.outputTokens) ?? [1]));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">Token usage across your projects. Costs are estimates from public API prices; your provider bills you directly.</p>
        <Segmented value={days} onChange={setDays} options={[{ value: "7", label: "7d" }, { value: "30", label: "30d" }, { value: "90", label: "90d" }]} />
      </div>
      {!data ? (
        <Spinner className="text-fg-subtle" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Messages", String(total!.runs)],
              ["Tokens", formatTokens(total!.tokens)],
              ["Est. cost", formatCost(total!.cost)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-border bg-elevated p-4">
                <div className="text-xs text-fg-subtle">{k}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-fg">{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-elevated p-5">
            <div className="mb-4 text-sm font-medium text-fg">Tokens per day</div>
            {data.byDay.length === 0 ? (
              <div className="py-8 text-center text-sm text-fg-subtle">No usage in this period.</div>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {data.byDay.map((d) => (
                  <div key={d.day} className="group relative flex flex-1 flex-col justify-end" title={`${d.day}: ${formatTokens(d.inputTokens + d.outputTokens)} tokens, ${formatCost(d.costUsd)}`}>
                    <div className="rounded-t-sm bg-accent/80 group-hover:bg-accent" style={{ height: `${Math.max(2, ((d.inputTokens + d.outputTokens) / maxTokens) * 100)}%` }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-elevated">
            <table className="w-full text-[13px]">
              <thead className="bg-subtle text-left text-xs text-fg-subtle">
                <tr>
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 font-medium">Key</th>
                  <th className="px-4 py-2 text-right font-medium">Messages</th>
                  <th className="px-4 py-2 text-right font-medium">Input</th>
                  <th className="px-4 py-2 text-right font-medium">Output</th>
                  <th className="px-4 py-2 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byModel.map((r) => (
                  <tr key={`${r.model}-${r.source}`}>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <ProviderIcon provider={r.provider} className="size-3.5" /> {r.model}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-fg-muted">{r.source === "user" ? "Yours" : "Platform"}</td>
                    <td className="px-4 py-2 text-right">{r.runs}</td>
                    <td className="px-4 py-2 text-right">{formatTokens(r.inputTokens)}</td>
                    <td className="px-4 py-2 text-right">{formatTokens(r.outputTokens)}</td>
                    <td className="px-4 py-2 text-right">{formatCost(r.costUsd)}</td>
                  </tr>
                ))}
                {data.byModel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-fg-subtle">
                      Nothing yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AccountTab() {
  const me = useMe();
  const [name, setName] = React.useState("");
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  React.useEffect(() => setName(me?.name ?? ""), [me]);
  if (!me) return <Spinner className="text-fg-subtle" />;
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-border bg-elevated p-5">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input value={me.email} disabled />
        </Field>
        <Button
          onClick={async () => {
            await api("/api/auth/me", { method: "PATCH", body: { name } });
            resetMeCache();
            toast.success("Profile updated");
          }}
        >
          Save
        </Button>
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-elevated p-5">
        <div className="text-sm font-medium text-fg">Change password</div>
        <Input type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <Input type="password" placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} />
        <Button
          variant="outline"
          disabled={!cur || next.length < 8}
          onClick={async () => {
            try {
              await api("/api/auth/me", { method: "PATCH", body: { currentPassword: cur, newPassword: next } });
              setCur("");
              setNext("");
              toast.success("Password changed");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not change password");
            }
          }}
        >
          Update password
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-danger/30 p-5">
        <div>
          <div className="text-sm font-medium text-fg">Delete account</div>
          <div className="text-xs text-fg-subtle">Permanently deletes your account, projects, keys and published sites.</div>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (prompt('Type "delete my account" to confirm') !== "delete my account") return;
            await api("/api/auth/me", { method: "DELETE" });
            window.location.href = "/";
          }}
        >
          Delete account
        </Button>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="rounded-2xl border border-border bg-elevated p-5">
      <div className="text-sm font-medium text-fg">Theme</div>
      <div className="mt-3">
        <Segmented value={theme} onChange={setTheme} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
      </div>
    </div>
  );
}
