"use client";

/**
 * Admin Chatbot — Knowledge Base CRUD (6.1)
 * Pola: sama dengan halaman admin lainnya (bg-[#0f0f11], dark, merah sebagai aksen).
 */
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Knowledge = {
  id: number;
  category: string;
  question: string;
  answer: string;
  created_at: string;
};

type PaginatedResponse = {
  total: number;
  page: number;
  limit: number;
  items: Knowledge[];
};

const CATEGORIES = [
  "Umum",
  "Pendaftaran",
  "Acara",
  "Galeri",
  "Kontak",
  "Teknis",
  "Lainnya",
];

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

// ─── Modal Tambah / Edit ───────────────────────────────────────────────────────
function KnowledgeModal({
  item,
  onClose,
  onSave,
}: {
  item: Partial<Knowledge> | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!item?.id;
  const [category, setCategory] = useState(item?.category ?? "Umum");
  const [question, setQuestion] = useState(item?.question ?? "");
  const [answer, setAnswer] = useState(item?.answer ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError("Pertanyaan dan jawaban wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = isEdit
        ? `/api/chatbot/knowledge/${item!.id}`
        : "/api/chatbot/knowledge";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({ category, question, answer }),
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
          <h3 className="font-bold text-white text-lg">
            {isEdit ? "Edit Knowledge" : "Tambah Knowledge"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Pertanyaan
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              placeholder="Contoh: Apa itu UFT?"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Jawaban
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              rows={5}
              placeholder="Tulis jawaban lengkap di sini..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminChatbotKnowledge() {
  const router = useRouter();
  const [items, setItems] = useState<Knowledge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Partial<Knowledge> | null | false>(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const limit = 15;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/chatbot/knowledge?${params}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
      const data: PaginatedResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset ke halaman 1 saat search berubah
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus knowledge ini? Tindakan tidak dapat dibatalkan.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/chatbot/knowledge/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 204) throw new Error("Gagal menghapus.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans pb-12">
      {/* Nav */}
      <nav className="bg-[#18181b] border-b border-white/5 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            href="/admin"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            ←
          </Link>
          <span className="font-bold text-white tracking-wide">🤖 Kelola Knowledge Angie</span>
          <div className="flex-1" />
          <Link
            href="/admin/chatbot/unanswered"
            className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block"
          >
            Unanswered →
          </Link>
          <Link
            href="/admin/chatbot/api-keys"
            className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block"
          >
            API Keys →
          </Link>
          <Link
            href="/admin/chatbot/stats"
            className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block"
          >
            Stats →
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} entri tersimpan</p>
          </div>
          <div className="flex-1 sm:flex justify-end gap-3 flex flex-col sm:flex-row">
            <input
              type="text"
              placeholder="Cari pertanyaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#18181b] text-white text-sm outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-64"
            />
            <button
              id="btn-tambah-knowledge"
              onClick={() => setModal({})}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all whitespace-nowrap shadow-[0_0_15px_rgba(220,38,38,0.25)]"
            >
              + Tambah
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-4 text-left font-semibold w-28">Kategori</th>
                  <th className="px-5 py-4 text-left font-semibold">Pertanyaan</th>
                  <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Jawaban</th>
                  <th className="px-5 py-4 text-right font-semibold w-28">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center text-slate-600">
                      {debouncedSearch ? "Tidak ada hasil untuk pencarian ini." : "Belum ada knowledge. Tambahkan entri pertama!"}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-200 max-w-xs">
                        <p className="truncate" title={item.question}>{item.question}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-500 max-w-sm hidden md:table-cell">
                        <p className="line-clamp-2 text-xs leading-relaxed" title={item.answer}>{item.answer}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setModal(item)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deleting === item.id}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all disabled:opacity-40"
                            title="Hapus"
                          >
                            {deleting === item.id ? "⏳" : "🗑️"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Hal {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal !== false && (
        <KnowledgeModal
          item={modal}
          onClose={() => setModal(false)}
          onSave={() => { setModal(false); fetchData(); }}
        />
      )}
    </main>
  );
}
