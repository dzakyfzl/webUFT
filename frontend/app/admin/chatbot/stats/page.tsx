"use client";

/**
 * Admin Chatbot — Stats Dashboard (6.4)
 * Tampilkan statistik Angie: token usage, conversation count, kill switch toggle.
 */
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ChatbotStats = {
  tokens_used_today: number;
  daily_token_limit: number;
  token_usage_pct: number;
  is_active: boolean;
  total_conversations_today: number;
  total_unanswered: number;
  total_knowledge: number;
  active_keys: number;
  failed_keys: number;
};

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: string;
}) {
  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
      <p className={`text-3xl font-bold mb-1 ${accent ?? "text-white"}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function TokenBar({ pct, isActive }: { pct: number; isActive: boolean }) {
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-400">Token Usage Hari Ini</p>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
            pct >= 90
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-white/5 border-white/10 text-slate-400"
          }`}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color} ${!isActive ? "opacity-30" : ""}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-600">
        {pct >= 90 && "⚠️ Hampir habis! "}
        {pct >= 70 && pct < 90 && "🟡 Mulai menipis. "}
        Reset otomatis setiap hari.
      </p>
    </div>
  );
}

export default function AdminChatbotStats() {
  const router = useRouter();
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chatbot/stats", { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat stats (${res.status})`);
      setStats(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleToggle = async () => {
    if (!stats) return;
    const action = stats.is_active ? "nonaktifkan" : "aktifkan";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} Angie sekarang?`)) return;
    setToggling(true);
    try {
      const res = await fetch("/api/chatbot/stats/toggle", {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Gagal toggle.");
      const data = await res.json();
      setStats((prev) => prev ? { ...prev, is_active: data.is_active } : prev);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal toggle.");
    } finally {
      setToggling(false);
    }
  };

  const formatToken = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans pb-12">
      <nav className="bg-[#18181b] border-b border-white/5 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin/chatbot" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">←</Link>
          <span className="font-bold text-white tracking-wide">📊 Statistik Angie</span>
          <div className="flex-1" />
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm transition-all disabled:opacity-40"
          >
            {loading ? "⏳" : "↻ Refresh"}
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

        {/* Kill Switch Banner */}
        <div
          className={`mb-6 p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
            stats?.is_active
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl">{stats?.is_active ? "🟢" : "🔴"}</span>
              <p className="font-bold text-white text-lg">
                Angie {stats?.is_active ? "Aktif" : "Nonaktif"}
              </p>
            </div>
            <p className="text-sm text-slate-500">
              {stats?.is_active
                ? "Angie sedang online dan siap menjawab pertanyaan pengunjung."
                : "Kill switch aktif — Angie tidak akan menjawab pertanyaan."}
            </p>
          </div>
          <button
            id="btn-toggle-angie"
            onClick={handleToggle}
            disabled={toggling || loading || !stats}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
              stats?.is_active
                ? "bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500"
                : "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500"
            }`}
          >
            {toggling ? "Mengubah..." : stats?.is_active ? "⏸ Nonaktifkan Angie" : "▶ Aktifkan Angie"}
          </button>
        </div>

        {/* Token Bar */}
        {stats ? (
          <TokenBar pct={stats.token_usage_pct} isActive={stats.is_active} />
        ) : (
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 animate-pulse h-28" />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {loading || !stats ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 animate-pulse h-28" />
            ))
          ) : (
            <>
              <StatCard
                icon="🗨️"
                label="Percakapan Hari Ini"
                value={stats.total_conversations_today}
                accent="text-violet-400"
              />
              <StatCard
                icon="❓"
                label="Pertanyaan Pending"
                value={stats.total_unanswered}
                accent={stats.total_unanswered > 0 ? "text-amber-400" : "text-white"}
                sub={stats.total_unanswered > 0 ? "Butuh perhatian" : undefined}
              />
              <StatCard
                icon="📚"
                label="Total Knowledge"
                value={stats.total_knowledge}
                accent="text-sky-400"
              />
              <StatCard
                icon="🔑"
                label="API Key Aktif"
                value={stats.active_keys}
                accent={stats.active_keys === 0 ? "text-red-400" : "text-emerald-400"}
                sub={stats.failed_keys > 0 ? `${stats.failed_keys} gagal` : undefined}
              />
              <StatCard
                icon="🪙"
                label="Token Dipakai"
                value={formatToken(stats.tokens_used_today)}
                sub={`dari ${formatToken(stats.daily_token_limit)}`}
                accent="text-white"
              />
              <StatCard
                icon="📉"
                label="Key Bermasalah"
                value={stats.failed_keys}
                accent={stats.failed_keys > 0 ? "text-red-400" : "text-slate-500"}
              />
            </>
          )}
        </div>

        {/* Quick Nav */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/admin/chatbot", label: "📖 Kelola Knowledge", desc: `${stats?.total_knowledge ?? "–"} entri` },
            { href: "/admin/chatbot/unanswered", label: "❓ Unanswered", desc: stats?.total_unanswered ? `${stats.total_unanswered} pending` : "Semua terjawab" },
            { href: "/admin/chatbot/api-keys", label: "🔑 API Keys", desc: `${stats?.active_keys ?? "–"} aktif` },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block bg-[#18181b] border border-white/5 rounded-2xl p-5 hover:border-red-500/30 hover:bg-red-500/[0.03] transition-all group"
            >
              <p className="font-semibold text-white text-sm group-hover:text-red-400 transition-colors mb-1">{item.label}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
