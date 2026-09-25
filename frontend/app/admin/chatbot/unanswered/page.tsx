"use client";

/**
 * Admin Chatbot — Unanswered Questions (6.2)
 * Tampilkan pertanyaan yang belum terjawab, bisa resolve langsung ke knowledge base.
 */
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UnansweredItem = {
  id: number;
  question: string;
  user_ip: string | null;
  is_resolved: boolean;
  created_at: string;
  resolved_knowledge_id: number | null;
};

type PaginatedResponse = {
  total: number;
  page: number;
  limit: number;
  items: UnansweredItem[];
};

const CATEGORIES = ["Umum", "Pendaftaran", "Acara", "Galeri", "Kontak", "Teknis", "Lainnya"];

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

// ─── Modal Resolve ─────────────────────────────────────────────────────────────
function ResolveModal({
  item,
  onClose,
  onSave,
}: {
  item: UnansweredItem;
  onClose: () => void;
  onSave: () => void;
}) {
  const [category, setCategory] = useState("Umum");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) { setError("Jawaban wajib diisi."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/chatbot/unanswered/${item.id}/resolve`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ category, answer }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail ?? `Gagal menyimpan (${res.status})`);
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Jawab & Simpan ke Knowledge</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Pertanyaan asal */}
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Pertanyaan</p>
            <p className="text-slate-200 text-sm">{item.question}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Jawaban</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              rows={5}
              placeholder="Tulis jawaban yang akan disimpan ke knowledge base..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
              Batal
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan & Tandai Resolved"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminChatbotUnanswered() {
  const router = useRouter();
  const [items, setItems] = useState<UnansweredItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterResolved, setFilterResolved] = useState<"all" | "no" | "yes">("no");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolveModal, setResolveModal] = useState<UnansweredItem | null>(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterResolved !== "all") params.set("is_resolved", filterResolved === "yes" ? "true" : "false");
      const res = await fetch(`/api/chatbot/unanswered?${params}`, { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat (${res.status})`);
      const data: PaginatedResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [page, filterResolved, router]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [filterResolved]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dt: string) => {
    try {
      return new Date(dt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return dt; }
  };

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans pb-12">
      <nav className="bg-[#18181b] border-b border-white/5 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin/chatbot" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">←</Link>
          <span className="font-bold text-white tracking-wide">❓ Pertanyaan Belum Terjawab</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Unanswered Questions</h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} pertanyaan ditemukan</p>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            {(["all", "no", "yes"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterResolved(v)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filterResolved === v
                    ? "bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]"
                    : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {v === "all" ? "Semua" : v === "no" ? "Belum" : "Sudah"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-4 text-left font-semibold">Pertanyaan</th>
                  <th className="px-5 py-4 text-left font-semibold hidden sm:table-cell w-40">Waktu</th>
                  <th className="px-5 py-4 text-left font-semibold w-28">Status</th>
                  <th className="px-5 py-4 text-right font-semibold w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center text-slate-600">
                      {filterResolved === "no" ? "Tidak ada pertanyaan yang menunggu jawaban. 🎉" : "Tidak ada data."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-slate-200">
                        <p className="line-clamp-2">{item.question}</p>
                        {item.user_ip && (
                          <p className="text-xs text-slate-600 mt-1">IP: {item.user_ip}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs hidden sm:table-cell">{formatDate(item.created_at)}</td>
                      <td className="px-5 py-4">
                        {item.is_resolved ? (
                          <span className="inline-flex px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg">
                            ✓ Resolved
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {!item.is_resolved && (
                          <div className="flex justify-end">
                            <button
                              id={`btn-resolve-${item.id}`}
                              onClick={() => setResolveModal(item)}
                              className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-all border border-red-500/20 hover:border-red-500"
                            >
                              Jawab
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between text-sm">
              <span className="text-slate-500">Hal {page} dari {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">← Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {resolveModal && (
        <ResolveModal
          item={resolveModal}
          onClose={() => setResolveModal(null)}
          onSave={() => { setResolveModal(null); fetchData(); }}
        />
      )}
    </main>
  );
}
