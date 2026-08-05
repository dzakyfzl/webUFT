"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { buildShortlinkUrl, shortlinkHost } from "@/app/lib/shortlink-url";

interface ShortLink {
  linkID: number;
  slug: string;
  destinationUrl: string;
}

// ─── Helper: refresh access token ─────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  const res = await fetch("/api/akun/access-token", {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  return data.access_token;
}

// ─── Komponen: ConfirmModal ────────────────────────────────────────────────────

function ConfirmModal({
  link,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  link: ShortLink;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-2xl mb-4 mx-auto">
          🗑️
        </div>
        <h3 className="text-white font-bold text-lg text-center mb-2">Hapus Shortlink?</h3>
        <p className="text-slate-400 text-sm text-center mb-1">
          Slug:{" "}
          <code className="bg-white/5 text-red-400 px-1.5 py-0.5 rounded font-mono text-xs">
            {link.slug}
          </code>
        </p>
        <p className="text-slate-600 text-xs text-center mb-6 break-all">
          {link.destinationUrl}
        </p>
        <p className="text-slate-500 text-xs text-center mb-6">
          Link yang dihapus tidak dapat dipulihkan.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Menghapus…
              </>
            ) : (
              "Ya, Hapus"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Komponen Utama ────────────────────────────────────────────────────────────

export default function KelolaLink() {
  const router = useRouter();
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<ShortLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const hasFetched = useRef(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLinks = useCallback(async () => {
    let token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const tryFetch = async (t: string) =>
      fetch("/api/shortlink/list", {
        headers: { Authorization: `Bearer ${t}` },
      });

    let res = await tryFetch(token);

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        router.push("/admin/login");
        return;
      }
      token = newToken;
      res = await tryFetch(token);
    }

    if (!res.ok) {
      setError("Gagal memuat data shortlink.");
      setIsLoading(false);
      return;
    }

    const data = await res.json();
    setLinks(data);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLinks();
  }, [fetchLinks]);

  const handleDelete = async () => {
    if (!confirmTarget) return;
    setIsDeleting(true);

    let token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const tryDelete = async (t: string) =>
      fetch(`/api/shortlink/hapus/${confirmTarget.linkID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });

    let res = await tryDelete(token);

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        router.push("/admin/login");
        return;
      }
      token = newToken;
      res = await tryDelete(token);
    }

    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.linkID !== confirmTarget.linkID));
      showToast("success", `Shortlink "${confirmTarget.slug}" berhasil dihapus`);
    } else {
      showToast("error", "Gagal menghapus shortlink. Coba lagi.");
    }

    setIsDeleting(false);
    setConfirmTarget(null);
  };

  const handleCopy = async (link: ShortLink) => {
    const url = buildShortlinkUrl(link.slug);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(link.linkID);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Filter berdasarkan search ─────────────────────────────────────────────
  const filtered = links.filter(
    (l) =>
      l.slug.toLowerCase().includes(search.toLowerCase()) ||
      l.destinationUrl.toLowerCase().includes(search.toLowerCase())
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-red-500 animate-spin" />
          <p className="text-slate-500 text-sm">Memuat shortlink…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans selection:bg-red-600/30">
      <div className="max-w-6xl mx-auto p-6 md:p-10">

        {/* ── Toast Notification ─────────────────────────────────────────── */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold transition-all animate-in ${
              toast.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <span>{toast.type === "success" ? "✓" : "⚠"}</span>
            {toast.msg}
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
              Kelola Link
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Lihat, cari, dan hapus shortlink yang sudah dibuat.
            </p>
          </div>
          <a
            href="/shortlink"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-0.5 text-sm"
          >
            <span className="text-lg leading-none">+</span> Buat Shortlink Baru
          </a>
        </header>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
              Total Shortlink
            </div>
            <div className="text-4xl font-extrabold text-white">{links.length}</div>
          </div>
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-4 -mt-4" />
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2 relative z-10">
              Hasil Pencarian
            </div>
            <div className="text-4xl font-extrabold text-red-500 relative z-10">
              {filtered.length}
            </div>
          </div>
        </div> */}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
            ⚠ {error}
          </div>
        )}

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <div className="mb-6 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
            🔍
          </span>
          <input
            id="input-search-link"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari slug atau URL tujuan…"
            className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Tabel ────────────────────────────────────────────────────────── */}
        <div className="bg-[#18181b] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Daftar Shortlink</h2>
            <span className="text-xs text-slate-500 font-mono">
              {shortlinkHost}/
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-5 text-xs uppercase tracking-widest text-slate-500 font-semibold">
                    Slug
                  </th>
                  <th className="p-5 text-xs uppercase tracking-widest text-slate-500 font-semibold hidden md:table-cell">
                    URL Tujuan
                  </th>
                  <th className="p-5 text-xs uppercase tracking-widest text-slate-500 font-semibold text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((link) => (
                  <tr
                    key={link.linkID}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Slug */}
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <a
                          href={buildShortlinkUrl(link.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-red-400 hover:text-red-300 transition-colors"
                        >
                          /{link.slug}
                        </a>
                        {/* URL tujuan di mobile */}
                        <p className="text-xs text-slate-600 break-all line-clamp-1 md:hidden">
                          {link.destinationUrl}
                        </p>
                      </div>
                    </td>

                    {/* URL Tujuan – desktop */}
                    <td className="p-5 hidden md:table-cell">
                      <a
                        href={link.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-400 hover:text-white transition-colors break-all line-clamp-2"
                      >
                        {link.destinationUrl}
                      </a>
                    </td>

                    {/* Aksi */}
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Tombol Salin */}
                        <button
                          onClick={() => handleCopy(link)}
                          title="Salin shortlink"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            copied === link.linkID
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {copied === link.linkID ? "✓ Tersalin" : "📋 Salin"}
                        </button>

                        {/* Tombol Hapus */}
                        <button
                          onClick={() => setConfirmTarget(link)}
                          title="Hapus shortlink"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-white/5 border-white/10 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-500"
                        >
                          🗑 Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">
                          {search ? "🔍" : "🔗"}
                        </span>
                        <p className="text-slate-500 text-sm">
                          {search
                            ? `Tidak ada shortlink yang cocok dengan "${search}"`
                            : "Belum ada shortlink yang dibuat."}
                        </p>
                        {search && (
                          <button
                            onClick={() => setSearch("")}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Hapus filter pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01] text-xs text-slate-500 text-center md:text-left">
            Menampilkan {filtered.length} dari {links.length} shortlink.
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ──────────────────────────────────────────────────── */}
      {confirmTarget && (
        <ConfirmModal
          link={confirmTarget}
          onConfirm={handleDelete}
          onCancel={() => setConfirmTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
