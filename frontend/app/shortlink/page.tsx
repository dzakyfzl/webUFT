"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, LoaderCircle } from "lucide-react";
import { buildShortlinkUrl, shortlinkHost } from "@/app/lib/shortlink-url";
import DynamicButton from "@/app/components/ui/dynamic-button";
import DirectionalPanels from "@/app/components/ui/directional-panels";
import { shakeInvalidField } from "@/app/lib/motion-preference";

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
  const [slugConflict, setSlugConflict] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [copied, setCopied] = useState(false);

  // Guard mencegah double-submit (dari double-click atau React StrictMode)
  const isSubmitting = useRef(false);
  const slugInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (slugConflict && slugInput.current) { slugInput.current.focus(); shakeInvalidField(slugInput.current); }
  }, [slugConflict]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setFormState("loading");
    setErrorMessage("");
    setSlugConflict(false);
    setNeedsLogin(false);
    setResultUrl("");

    const finalSlug = slug.trim() || generateRandomSlug();

    try {
      const identity = await fetch("/api/admin/me", { credentials: "same-origin", cache: "no-store" });
      if (identity.status === 401 || identity.status === 403) {
        setNeedsLogin(true);
        setErrorMessage("Masuk sebagai pengurus aktif untuk membuat short link.");
        setFormState("error");
        return;
      }
      if (!identity.ok) throw new Error("Session unavailable");
      const me = await identity.json();
      const res = await fetch("/api/admin/links", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": me.csrf_token },
        body: JSON.stringify({
          period_id: me.period_id,
          slug: finalSlug,
          destination_url: destinationUrl.trim(),
          active: true,
        }),
      });

      const data = await res.json();

      if (res.status === 201) {
        const shortUrl = buildShortlinkUrl(data.slug);
        setResultUrl(shortUrl);
        setFormState("success");
        setSlug(data.slug); // sync tampilan slug dengan yang tersimpan
      } else if (res.status === 409) {
        setSlugConflict(Boolean(slug.trim()));
        setErrorMessage(`Slug "${finalSlug}" sudah digunakan. Coba slug lain.`);
        setFormState("error");
      } else if (res.status === 422) {
        // Validation error dari Pydantic
        const detail = data?.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          setErrorMessage(detail[0]?.msg || "Input tidak valid.");
        } else {
          setErrorMessage(data?.error?.message || "Input tidak valid. Periksa URL dan slug.");
        }
        setFormState("error");
      } else {
        setErrorMessage(data?.error?.message || data?.message || "Terjadi kesalahan. Silakan coba lagi.");
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
    setSlugConflict(false);
    setDestinationUrl("");
    setSlug("");
    setCopied(false);
  };

  // ── Input base classes (mengikuti tema dark yang ada di project) ───────────
  const inputCls =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all";

  const labelCls = "block text-xs font-semibold text-slate-300 mb-1.5";

  return (
    <main className="min-h-screen w-full bg-[#0f0f11] font-sans selection:bg-red-600/30 flex flex-col [--field-error-color:#fca5a5]">

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
            <DirectionalPanels step={formState === "success" ? 1 : 0}>

            {/* ── FORM STATE ── */}
            {(formState === "idle" || formState === "loading" || formState === "error") && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* Destination URL */}
                <div>
                  <label htmlFor="dest-url" className={labelCls}>
                    URL Tujuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dest-url"
                    name="destination_url"
                    aria-describedby="destination-hint"
                    maxLength={2000}
                    data-step-focus
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/halaman-sangat-panjang"
                    className={inputCls}
                    required
                    disabled={formState === "loading"}
                    autoFocus
                  />
                  <p id="destination-hint" className="mt-1.5 text-xs text-slate-400">
                    Harus diawali dengan <code className="text-slate-500">https://</code> atau <code className="text-slate-500">http://</code>
                  </p>
                </div>

                {/* Custom Slug */}
                <div>
                  <label htmlFor="custom-slug" className={labelCls}>
                    Slug (opsional)
                  </label>
                  <div data-validation-anchor className="flex items-center gap-0">
                    <span className="bg-white/[0.02] border border-r-0 border-white/10 rounded-l-lg px-2 py-2.5 text-slate-400 text-xs font-mono whitespace-nowrap flex-shrink-0">
                      {shortlinkHost}/
                    </span>
                    <input
                      id="custom-slug"
                      name="slug"
                      autoCapitalize="none"
                      spellCheck={false}
                      ref={slugInput}
                      type="text"
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value); setSlugConflict(false); }}
                      aria-invalid={slugConflict || undefined}
                      aria-describedby={slugConflict ? "slug-hint shortlink-error" : "slug-hint"}
                      placeholder="webLink"
                      className="min-w-0 flex-1 bg-white/[0.04] border border-white/10 rounded-r-lg px-3 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all font-mono"
                      disabled={formState === "loading"}
                      pattern={String.raw`[a-zA-Z0-9][a-zA-Z0-9_\-]*`}
                      minLength={3}
                      maxLength={80}
                    />
                  </div>
                  <p id="slug-hint" className="mt-1.5 text-xs text-slate-400">
                    Kosongkan untuk slug acak. Awali dengan huruf atau angka. Karakter lain yang didukung <code className="text-slate-500">-</code> dan <code className="text-slate-500">_</code>
                  </p>
                </div>

                {/* Error message */}
                {formState === "error" && errorMessage && (
                  <div id="shortlink-error" role="alert" className="flex flex-col gap-3 bg-red-600/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">{errorMessage}</p>
                    {needsLogin && <Link href="/admin/login" className="text-sm text-white underline">Masuk pengurus</Link>}
                  </div>
                )}

                {/* Submit */}
                <DynamicButton
                  id="btn-buat-shortlink"
                  type="submit"
                  fullWidth
                  icon={formState === "loading" && <LoaderCircle className="size-4 animate-spin"/>}
                  disabled={formState === "loading"}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    formState === "loading"
                      ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {formState === "loading" ? "Membuat shortlink…" : "Buat Shortlink"}
                </DynamicButton>
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
                  <p className="text-white font-bold text-lg" role="status" data-step-focus tabIndex={-1}>Shortlink berhasil dibuat!</p>
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
                  <DynamicButton
                    id="btn-copy-shortlink"
                    type="button"
                    fullWidth
                    icon={copied ? <Check size={16}/> : <Clipboard size={16}/>}
                    onClick={handleCopy}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      copied
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    {copied ? "Tersalin!" : "Salin URL"}
                  </DynamicButton>
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
            </DirectionalPanels>
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
