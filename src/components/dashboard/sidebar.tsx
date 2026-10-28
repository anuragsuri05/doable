"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FolderOpen, Star, Settings, BarChart3, Plus, LogOut, Moon, Sun, Monitor, PanelLeftClose, PanelLeft, KeyRound } from "lucide-react";
import { Logo } from "@/components/ui/misc";
import { Menu, MenuItem, MenuSeparator, MenuLabel } from "@/components/ui/menu";
import { api } from "@/lib/api";
import { resetMeCache, useMe, useTheme } from "@/lib/hooks";
import type { ProjectSummary } from "@/lib/types";
import { cn } from "@/lib/cn";

export function Sidebar({ projects }: { projects?: ProjectSummary[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const [theme, setTheme] = useTheme();
  const [collapsed, setCollapsed] = React.useState(false);

  const nav = [
    { href: "/", label: "Home", icon: Home },
    { href: "/projects", label: "All projects", icon: FolderOpen },
    { href: "/projects?filter=starred", label: "Starred", icon: Star },
    { href: "/settings?tab=usage", label: "Usage", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  const recent = (projects ?? []).slice(0, 8);

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-subtle py-3">
        <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 text-fg-muted hover:bg-muted" title="Expand sidebar">
          <PanelLeft className="size-4" />
        </button>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} title={n.label} className="rounded-lg p-2 text-fg-muted hover:bg-muted hover:text-fg">
            <n.icon className="size-4" />
          </Link>
        ))}
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-subtle md:flex">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/">
          <Logo />
        </Link>
        <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-fg-subtle hover:bg-muted hover:text-fg" title="Collapse sidebar">
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <div className="px-3">
        <Link
          href="/"
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-[13px] font-medium text-fg shadow-sm hover:bg-bg"
        >
          <Plus className="size-4" /> New project
        </Link>
      </div>
      <nav className="mt-3 space-y-0.5 px-3">
        {nav.map((n) => {
          const active = n.href === pathname || (n.href === "/projects" && pathname === "/projects");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-fg-muted hover:bg-muted hover:text-fg",
                active && "bg-muted text-fg",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      {recent.length > 0 && (
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3">
          <div className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-fg-subtle uppercase">Recent</div>
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex h-8 items-center gap-2 truncate rounded-lg px-2.5 text-[13px] text-fg-muted hover:bg-muted hover:text-fg"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-auto border-t border-border p-3">
        <Menu
          side="top"
          className="w-60"
          trigger={
            <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-muted">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-semibold text-white">
                {me?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-fg">{me?.name ?? "…"}</span>
                <span className="block truncate text-xs text-fg-subtle">{me?.email}</span>
              </span>
            </button>
          }
        >
          {(close) => (
            <>
              <MenuItem icon={<Settings />} onClick={() => (close(), router.push("/settings"))}>
                Settings
              </MenuItem>
              <MenuItem icon={<KeyRound />} onClick={() => (close(), router.push("/settings?tab=providers"))}>
                AI providers
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>Theme</MenuLabel>
              <MenuItem icon={<Sun />} active={theme === "light"} onClick={() => setTheme("light")}>
                Light
              </MenuItem>
              <MenuItem icon={<Moon />} active={theme === "dark"} onClick={() => setTheme("dark")}>
                Dark
              </MenuItem>
              <MenuItem icon={<Monitor />} active={theme === "system"} onClick={() => setTheme("system")}>
                System
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={<LogOut />}
                onClick={async () => {
                  await api("/api/auth/logout", { method: "POST" });
                  resetMeCache();
                  window.location.href = "/";
                }}
              >
                Sign out
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </aside>
  );
}
