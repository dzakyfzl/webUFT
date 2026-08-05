"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Status = "loading" | "redirecting" | "not_found" | "error";

export default function ShortlinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [destination, setDestination] = useState<string>("");

  // Guard untuk mencegah double-fetch akibat React StrictMode
  // React StrictMode me-mount komponen 2x di development, useRef tidak ter-reset.
  const hasFetched = useRef(false);

  useEffect(() => {
    // Jika sudah pernah di-fetch (mount kedua dari StrictMode), batalkan
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (!slug) {
      setStatus("not_found");
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        const res = await fetch(`/api/shortlink/r/${encodeURIComponent(slug)}`);

        if (res.status === 404) {
          setStatus("not_found");
          return;
        }

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const data = await res.json();
        const dest: string = data.destinationUrl;

        setDestination(dest);
        setStatus("redirecting");

        // Redirect ke destinasi
        window.location.href = dest;
      } catch {
        setStatus("error");
      }
    };

    fetchAndRedirect();
  }, [slug]);

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Logo / Brand */}
      <div className="mb-10 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-uft.png" alt="Logo UFT" className="w-12 h-12 opacity-80" />
        <span className="text-slate-500 text-sm font-semibold tracking-widest uppercase">
          UFT Shortlink
        </span>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-red-500 animate-spin" />
          <p className="text-slate-400 text-sm">Mencari shortlink…</p>
        </div>
      )}

      {status === "redirecting" && (
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-red-500 animate-spin" />
          <p className="text-slate-300 text-sm font-medium">Mengalihkan ke tujuan…</p>
          {destination && (
            <p className="text-slate-600 text-xs break-all">{destination}</p>
          )}
          <a
            href={destination}
            className="mt-2 text-red-500 hover:text-red-400 text-xs underline underline-offset-2 transition-colors"
          >
            Klik di sini jika tidak dialihkan otomatis
          </a>
        </div>
      )}

      {status === "not_found" && (
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-3xl">
            🔍
          </div>
          <div>
            <h1 className="text-white text-xl font-bold mb-2">Shortlink tidak ditemukan</h1>
            <p className="text-slate-500 text-sm">
              Shortlink{" "}
              <code className="bg-slate-800 text-red-400 px-1.5 py-0.5 rounded text-xs font-mono">
                /{slug}
              </code>{" "}
              tidak ada atau sudah dihapus.
            </p>
          </div>
          <a
            href="/"
            className="mt-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-sm font-medium transition-all"
          >
            ← Kembali ke Beranda
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <div>
            <h1 className="text-white text-xl font-bold mb-2">Terjadi kesalahan</h1>
            <p className="text-slate-500 text-sm">
              Gagal memuat shortlink. Silakan coba lagi beberapa saat.
            </p>
          </div>
          <button
            onClick={() => {
              hasFetched.current = false;
              setStatus("loading");
            }}
            className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium transition-all"
          >
            Coba Lagi
          </button>
        </div>
      )}
    </main>
  );
}
