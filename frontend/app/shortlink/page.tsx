"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { buildShortlinkUrl, shortlinkHost } from "@/app/lib/shortlink-url";

type FormState = "idle" | "loading" | "success" | "error";

function generateRandomSlug(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export default function ShortlinkPage() {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [resultUrl, setResultUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Guard mencegah double-submit (dari double-click atau React StrictMode)
  const isSubmitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setFormState("loading");
    setErrorMessage("");
    setResultUrl("");

    const finalSlug = slug.trim() || generateRandomSlug();

    try {
      const res = await fetch("/api/shortlink/tambah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: finalSlug,
          destinationUrl: destinationUrl.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 201) {
        const shortUrl = buildShortlinkUrl(data.slug);
        setResultUrl(shortUrl);
        setFormState("success");
        setSlug(data.slug); // sync tampilan slug dengan yang tersimpan
      } else if (res.status === 409) {
        setErrorMessage(`Slug "${finalSlug}" sudah digunakan. Coba slug lain.`);
        setFormState("error");
      } else if (res.status === 422) {
        // Validation error dari Pydantic
        const detail = data?.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          setErrorMessage(detail[0]?.msg || "Input tidak valid.");
        } else {
          setErrorMessage("Input tidak valid. Periksa URL dan slug.");
        }
        setFormState("error");
      } else {
        setErrorMessage(data?.message || "Terjadi kesalahan. Silakan coba lagi.");
        setFormState("error");
      }
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setFormState("error");
    } finally {
      isSubmitting.current = false;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = resultUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setFormState("idle");
    setResultUrl("");
    setErrorMessage("");
    setDestinationUrl("");
    setSlug("");
    setCopied(false);
  };

  // ── Input base classes (mengikuti tema dark yang ada di project) ───────────
  const inputCls =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all";

  const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2";

  return (
    <main className="min-h-screen w-full bg-[#0f0f11] font-sans selection:bg-red-600/30 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-white/5 bg-[#18181b] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-uft.png" alt="Logo UFT" className="w-8 h-8" />
          <span className="font-bold text-white tracking-wide text-lg">
            UFT<span className="text-red-500 font-normal">Link</span>
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
        >
          ← Beranda
        </Link>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 shadow-[0_0_40px_rgba(220,38,38,0.15)] mb-6">
              <span className="text-3xl">🔗</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
              Buat Shortlink
            </h1>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Persingkat URL panjang menjadi link yang mudah dibagikan melalui{" "}
              <span className="text-slate-400 font-mono">{shortlinkHost}</span>
            </p>
          </div>

          {/* Card */}
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">

            {/* ── FORM STATE ── */}
            {(formState === "idle" || formState === "loading" || formState === "error") && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {/* Destination URL */}
                <div>
                  <label htmlFor="dest-url" className={labelCls}>
                    URL Tujuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dest-url"
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/halaman-sangat-panjang"
                    className={inputCls}
                    required
                    disabled={formState === "loading"}
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-slate-600">
                    Harus diawali dengan <code className="text-slate-500">https://</code> atau <code className="text-slate-500">http://</code>
                  </p>
                </div>

                {/* Custom Slug */}
                <div>
                  <label htmlFor="custom-slug" className={labelCls}>
                    Link Custom
                  </label>
                  <div className="flex items-center gap-0">
                    <span className="bg-white/[0.02] border border-r-0 border-white/10 rounded-l-xl px-3 py-3 text-slate-500 text-xs font-mono whitespace-nowrap flex-shrink-0">
                      {shortlinkHost}/
                    </span>
                    <input
                      id="custom-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="webLink"
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-r-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all font-mono"
                      disabled={formState === "loading"}
                      pattern="[a-zA-Z0-9_-]*"
                      maxLength={100}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Kosongkan untuk slug acak. Hanya huruf, angka, <code className="text-slate-500">-</code> dan <code className="text-slate-500">_</code>
                  </p>
                </div>

                {/* Error message */}
                {formState === "error" && errorMessage && (
                  <div className="flex items-start gap-3 bg-red-600/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">⚠️</span>
                    <p className="text-red-400 text-sm">{errorMessage}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  id="btn-buat-shortlink"
                  type="submit"
                  disabled={formState === "loading" || !destinationUrl.trim()}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    formState === "loading" || !destinationUrl.trim()
                      ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_24px_rgba(220,38,38,0.3)] hover:shadow-[0_0_32px_rgba(220,38,38,0.5)] hover:scale-[1.01] active:scale-[0.99]"
                  }`}
                >
                  {formState === "loading" ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Membuat shortlink…
                    </>
                  ) : (
                    <>
                      <span>🔗</span> Buat Shortlink
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── SUCCESS STATE ── */}
            {formState === "success" && (
              <div className="flex flex-col gap-6">
                {/* Checkmark */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg">Shortlink berhasil dibuat!</p>
                  <p className="text-slate-500 text-sm text-center">
                    Bagikan link di bawah ini kepada siapa saja.
                  </p>
                </div>

                {/* Result URL box */}
                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    URL Shortlink
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-red-400 hover:text-red-300 font-mono text-sm break-all transition-colors"
                    >
                      {resultUrl}
                    </a>
                  </div>
                  {/* Copy button */}
                  <button
                    id="btn-copy-shortlink"
                    type="button"
                    onClick={handleCopy}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      copied
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    {copied ? (
                      <><span>✓</span> Tersalin!</>
                    ) : (
                      <><span>📋</span> Salin URL</>
                    )}
                  </button>
                </div>

                {/* Info: slug dipakai */}
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                  <span className="text-slate-500 text-xs">Slug:</span>
                  <code className="text-slate-400 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">
                    {slug}
                  </code>
                </div>

                {/* Buat lagi */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all"
                >
                  + Buat Shortlink Lagi
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-slate-700 text-xs mt-6">
            Shortlink yang dibuat bersifat publik dan permanen.
          </p>
        </div>
      </div>

      {/* Footer */}
      {/* <footer className="w-full border-t border-white/5 py-6 text-center">
        <p className="text-slate-700 text-xs">
          © 2026 UKM Fotografi Telkom University
        </p>
      </footer> */}

    </main>
  );
}
