import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "doable_session";
const PROTECTED = ["/dashboard", "/projects", "/settings"];

function siteSlug(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.toLowerCase();
  const base = process.env.DOABLE_SITES_HOST?.toLowerCase();
  if (base && hostname.endsWith(`.${base}`)) return hostname.slice(0, -(base.length + 1));
  const m = hostname.match(/^([a-z0-9-]+)\.localhost(?::\d+)?$/);
  return m ? m[1] : null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Published apps: <slug>.localhost:3000/... -> /api/sites/<slug>/...
  const slug = siteSlug(request.headers.get("host"));
  if (slug && slug !== "www") {
    const url = request.nextUrl.clone();
    url.pathname = `/api/sites/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.get(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
