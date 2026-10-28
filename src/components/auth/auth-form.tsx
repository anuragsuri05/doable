"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { resetMeCache } from "@/lib/hooks";

export function AuthForm({ kind }: { kind: "login" | "signup" }) {
  const params = useSearchParams();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api(`/api/auth/${kind}`, { method: "POST", body: kind === "signup" ? { name, email, password } : { email, password } });
      resetMeCache();
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : kind === "signup" ? "/settings?tab=providers&welcome=1" : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="brand-gradient flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-2xl border border-border bg-elevated p-6 shadow-card">
          <h1 className="text-xl font-semibold text-fg">{kind === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-fg-muted">{kind === "login" ? "Log in to keep building." : "Start building apps with AI in minutes."}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {kind === "signup" && (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Ada Lovelace" />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={kind === "signup" ? 8 : undefined}
                autoComplete={kind === "signup" ? "new-password" : "current-password"}
                placeholder={kind === "signup" ? "At least 8 characters" : "••••••••"}
              />
            </Field>
            {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              {kind === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-fg-muted">
          {kind === "login" ? (
            <>
              No account?{" "}
              <Link href="/signup" className="font-medium text-fg underline-offset-4 hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
