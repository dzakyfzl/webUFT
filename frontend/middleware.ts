import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware untuk routing subdomain shortlink.
 *
 * Ketika request masuk dari subdomain `link.*` (misal link.ukmfotografitelkom.com),
 * path `/slug` di-rewrite secara internal ke `/link/slug` sehingga
 * halaman redirect di `app/link/[slug]/page.tsx` yang menanganinya.
 *
 * Contoh:
 *   link.ukmfotografitelkom.com/test  →  internal rewrite ke /link/test
 *   ukmfotografitelkom.com/shortlink  →  tidak diubah, lanjut normal
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  const sub = process.env.NEXT_PUBLIC_SHORTLINK_SUBDOMAIN || "link";
  const subPrefix = `${sub}.`;

  // Deteksi subdomain dari env (misal link.ukmfotografitelkom.com atau link.localhost)
  const isShortlinkSubdomain = host.startsWith(subPrefix);

  if (isShortlinkSubdomain) {
    // Abaikan request ke _next/ (asset statis Next.js) agar tidak ikut di-rewrite
    if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    // Ekstrak slug: pathname "/" → abaikan; "/test-slug" → "/link/test-slug"
    const slug = pathname.slice(1); // hapus leading slash
    if (!slug) {
      // Root subdomain tanpa slug → arahkan ke halaman generate
      return NextResponse.redirect(
        new URL("/shortlink", request.url.replace(host, host.replace(new RegExp(`^${sub}\.`), "")))
      );
    }

    // Rewrite internal ke /link/[slug] tanpa redirect (URL di browser tetap subdomain.domain/slug)
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${sub}/${slug}`;
    return NextResponse.rewrite(rewriteUrl);
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
