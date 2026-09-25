"use client";

/**
 * Admin Chatbot — API Key Pool (6.3)
 * Manage Gemini API keys: tambah, toggle aktif/nonaktif, reset, hapus.
 * Key asli TIDAK pernah ditampilkan (hanya preview dari backend).
 */
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiKey = {
  id: number;
  label: string;
  key_preview: string;
  priority: number;
  status: "active" | "disabled" | "failed" | "exhausted";
  failure_count: number;
  created_at: string;
};

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
    ...extra,
  };
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  disabled: "bg-slate-500/10 border-slate-500/20 text-slate-400",
  failed: "bg-red-500/10 border-red-500/20 text-red-400",
  exhausted: "bg-amber-500/10 border-amber-500/20 text-amber-400",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  disabled: "Disabled",
  failed: "Failed",
  exhausted: "Exhausted",
};

// ─── Modal Tambah Key ──────────────────────────────────────────────────────────
function AddKeyModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) { setError("API key wajib diisi."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chatbot/api-keys", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ api_key: apiKey.trim(), label: label.trim() || undefined, priority }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail ?? `Gagal menambahkan key (${res.status})`);
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Tambah API Key</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          {/* Security notice */}
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400 leading-relaxed">
              🔐 API key akan dienkripsi dengan AES-256-GCM sebelum disimpan. Key asli tidak dapat dilihat kembali setelah disimpan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Gemini API Key *</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              placeholder="AIza..."
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Label (opsional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Key Utama, Key Backup..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prioritas (1 = tertinggi)</label>
            <input
              type="number"
              min={1}
              max={99}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">Batal</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminChatbotApiKeys() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chatbot/api-keys", { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat (${res.status})`);
      setKeys(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/chatbot/api-keys/${id}/toggle`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error("Gagal toggle.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal toggle.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (id: number) => {
    if (!confirm("Reset failure count key ini?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/chatbot/api-keys/${id}/reset`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("Gagal reset.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal reset.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus API key ini? Tindakan tidak dapat dibatalkan.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/chatbot/api-keys/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok && res.status !== 204) throw new Error("Gagal menghapus.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = keys.filter((k) => k.status === "active").length;

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans pb-12">
      <nav className="bg-[#18181b] border-b border-white/5 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/admin/chatbot" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">←</Link>
          <span className="font-bold text-white tracking-wide">🔑 API Key Pool</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Gemini API Keys</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeCount} dari {keys.length} key aktif
            </p>
          </div>
          <button
            id="btn-tambah-api-key"
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.25)]"
          >
            + Tambah Key
          </button>
        </div>

        {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))
          ) : keys.length === 0 ? (
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-16 text-center text-slate-600">
              Belum ada API key. Tambahkan setidaknya satu key untuk mengaktifkan Angie.
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="bg-[#18181b] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`inline-flex px-2.5 py-1 border text-xs font-semibold rounded-lg ${STATUS_STYLES[key.status]}`}>
                      {STATUS_LABEL[key.status]}
                    </span>
                    <span className="text-xs text-slate-500">Prioritas #{key.priority}</span>
                    {key.failure_count > 0 && (
                      <span className="text-xs text-red-400">{key.failure_count} fail</span>
                    )}
                  </div>
                  <p className="font-semibold text-white text-sm">
                    {key.label || `Key #${key.id}`}
                  </p>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">{key.key_preview}</p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(key.id)}
                    disabled={actionLoading === key.id}
                    title={key.status === "active" || key.status === "disabled" ? (key.status === "active" ? "Nonaktifkan" : "Aktifkan") : "Toggle"}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-semibold disabled:opacity-40"
                  >
                    {key.status === "active" ? "⏸ Nonaktif" : "▶ Aktifkan"}
                  </button>

                  {/* Reset */}
                  {(key.status === "failed" || key.status === "exhausted" || key.failure_count > 0) && (
                    <button
                      onClick={() => handleReset(key.id)}
                      disabled={actionLoading === key.id}
                      title="Reset failure count"
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 transition-all text-xs font-semibold disabled:opacity-40"
                    >
                      🔄 Reset
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(key.id)}
                    disabled={actionLoading === key.id}
                    title="Hapus key"
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all disabled:opacity-40"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <AddKeyModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData(); }}
        />
      )}
    </main>
  );
}
