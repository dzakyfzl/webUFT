import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware untuk routing subdomain.
 *
 * 1. Shortlink: `link.*` → rewrite `/slug` ke `/link/slug`
 * 2. HR: `hr.*` → rewrite `/path` ke `/hr/path`
 *
 * Contoh:
 *   link.ukmfotografitelkom.com/test    →  internal rewrite ke /link/test
 *   hr.ukmfotografitelkom.com/dashboard →  internal rewrite ke /hr/dashboard
 *   ukmfotografitelkom.com/shortlink    →  tidak diubah, lanjut normal
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // --- Shortlink subdomain ---
  const shortlinkSub = process.env.NEXT_PUBLIC_SHORTLINK_SUBDOMAIN || "link";
  const shortlinkPrefix = `${shortlinkSub}.`;

  if (host.startsWith(shortlinkPrefix)) {
    // Abaikan request ke _next/ (asset statis Next.js) agar tidak ikut di-rewrite
    if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    // Ekstrak slug: pathname "/" → abaikan; "/test-slug" → "/link/test-slug"
    const slug = pathname.slice(1); // hapus leading slash
    if (!slug) {
      // Root subdomain tanpa slug → arahkan ke halaman generate
      return NextResponse.redirect(
        new URL("/shortlink", request.url.replace(host, host.replace(new RegExp(`^${shortlinkSub}\\.`), "")))
      );
    }

    // Rewrite internal ke /link/[slug] tanpa redirect (URL di browser tetap subdomain.domain/slug)
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${shortlinkSub}/${slug}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // --- HR subdomain ---
  const hrSub = process.env.NEXT_PUBLIC_HR_SUBDOMAIN || "hr";
  const hrPrefix = `${hrSub}.`;

  if (host.startsWith(hrPrefix)) {
    // Abaikan asset statis Next.js dan API proxy
    if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    // Root HR subdomain → rewrite ke /hr (dashboard)
    if (pathname === "/") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = "/hr";
      return NextResponse.rewrite(rewriteUrl);
    }

    // Prefix semua path dengan /hr jika belum ada
    if (!pathname.startsWith(`/${hrSub}`)) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/${hrSub}${pathname}`;
      return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    /*
     * Match semua path kecuali:
     * - /api/ (backend proxy)
     * - /_next/ (Next.js internals)
     * - /favicon.ico, /logo*.png (static files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo|public).*)",
  ],
};

