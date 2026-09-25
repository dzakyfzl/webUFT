"use client";

/**
 * KelolaChatbot — subdashboard panel untuk Chatbot Angie.
 * Tab: Knowledge Base | Tak Terjawab | API Keys | Statistik
 */
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Tipe Data ────────────────────────────────────────────────────────────────
type Knowledge = {
  id: number;
  category: string;
  question: string;
  answer: string;
  is_active: boolean;
  created_at: string;
};

type PaginatedKnowledge = {
  total: number;
  page: number;
  limit: number;
  items: Knowledge[];
};

type Unanswered = {
  id: number;
  question: string;
  user_ip: string | null;
  asked_at: string;
  is_resolved: boolean;
};

type PaginatedUnanswered = {
  total: number;
  page: number;
  limit: number;
  items: Unanswered[];
};

type ApiKey = {
  id: number;
  label: string;
  key_preview: string;
  status: string;
  priority: number;
  fail_count: number;
  total_requests: number;
  last_used_at: string | null;
};

// Field stats sesuai ChatbotStats schema backend
type ChatbotStats = {
  daily_token_limit: number;
  tokens_used_today: number;
  token_usage_pct: number;
  is_active: boolean;
  total_conversations_today: number;
  total_unanswered: number;
  total_knowledge: number;
  active_keys: number;
  failed_keys: number;
};

const CATEGORIES = ["Umum", "Pendaftaran", "Acara", "Galeri", "Kontak", "Teknis", "Lainnya"];
const KNOWLEDGE_LIMIT = 15;

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

// ─── Badge Status ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    failed:    "bg-red-500/10 border-red-500/20 text-red-400",
    exhausted: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    disabled:  "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };
  return (
    <span className={`inline-flex px-2.5 py-1 border text-xs font-semibold rounded-lg ${map[status] ?? map.disabled}`}>
      {status}
    </span>
  );
}

// ─── Modal Tambah/Edit Knowledge ──────────────────────────────────────────────
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
  const [answer, setAnswer]     = useState(item?.answer ?? "");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError("Pertanyaan dan jawaban wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url    = isEdit ? `/api/chatbot/knowledge/${item!.id}` : "/api/chatbot/knowledge";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
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
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pertanyaan</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              placeholder="Contoh: Apa itu UFT?"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Jawaban</label>
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
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">Batal</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Resolve Unanswered ──────────────────────────────────────────────────
function ResolveModal({
  item,
  onClose,
  onSave,
}: {
  item: Unanswered;
  onClose: () => void;
  onSave: () => void;
}) {
  const [category, setCategory] = useState("Umum");
  const [answer, setAnswer]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) { setError("Jawaban wajib diisi."); return; }
    setLoading(true);
    setError("");
    try {
      // Backend: POST /chatbot/unanswered/{id}/resolve dengan body {answer, category}
      const res = await fetch(`/api/chatbot/unanswered/${item.id}/resolve`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ answer, category }),
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
          <h3 className="font-bold text-white text-lg">Jawab Pertanyaan</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tampilkan pertanyaannya */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Pertanyaan</p>
            <p className="text-sm text-slate-200">{item.question}</p>
          </div>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Jawaban (akan ditambah ke Knowledge Base)</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              rows={4}
              placeholder="Tulis jawaban lengkap..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">Batal</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan & Tambah ke KB"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Tambah API Key ─────────────────────────────────────────────────────
function ApiKeyModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [label, setLabel]       = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [priority, setPriority] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) { setError("Label dan API Key wajib diisi."); return; }
    setLoading(true);
    setError("");
    try {
      // Backend: POST /chatbot/api-keys (plural)
      const res = await fetch("/api/chatbot/api-keys", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ label, api_key: apiKey, priority }),
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
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Tambah API Key</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Contoh: Key Utama" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">API Key Gemini</label>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} required placeholder="AIza..." type="password" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prioritas (0 = tertinggi)</label>
            <input value={priority} onChange={(e) => setPriority(Number(e.target.value))} type="number" min={0} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f11] text-white outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">Batal</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50">
              {loading ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Knowledge Base ──────────────────────────────────────────────────────
function TabKnowledge({ router }: { router: ReturnType<typeof useRouter> }) {
  const [items, setItems]               = useState<Knowledge[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [modal, setModal]               = useState<Partial<Knowledge> | null | false>(false);
  const [deleting, setDeleting]         = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(KNOWLEDGE_LIMIT),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      // GET /api/chatbot/knowledge?page=&limit=&search=
      const res = await fetch(`/api/chatbot/knowledge?${params}`, { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
      const data: PaginatedKnowledge = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, router]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus knowledge ini? Tindakan tidak dapat dibatalkan.")) return;
    setDeleting(id);
    try {
      // DELETE /api/chatbot/knowledge/{id}
      const res = await fetch(`/api/chatbot/knowledge/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok && res.status !== 204) throw new Error("Gagal menghapus.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / KNOWLEDGE_LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Knowledge Base</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} entri tersimpan</p>
        </div>
        <div className="flex-1 flex justify-end gap-3 flex-col sm:flex-row">
          <input
            type="text"
            placeholder="Cari pertanyaan atau jawaban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#0f0f11] text-white text-sm outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-72"
          />
          <button
            onClick={() => setModal({})}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all whitespace-nowrap shadow-[0_0_15px_rgba(220,38,38,0.25)]"
          >
            + Tambah
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

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
                  <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg">{item.category}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-200 max-w-xs">
                      <p className="truncate" title={item.question}>{item.question}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500 max-w-sm hidden md:table-cell">
                      <p className="line-clamp-2 text-xs leading-relaxed" title={item.answer}>{item.answer}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModal(item)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all" title="Edit">✏️</button>
                        <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all disabled:opacity-40" title="Hapus">
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

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-slate-500">Hal {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 transition-all">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 transition-all">Next →</button>
            </div>
          </div>
        )}
      </div>

      {modal !== false && (
        <KnowledgeModal item={modal} onClose={() => setModal(false)} onSave={() => { setModal(false); fetchData(); }} />
      )}
    </div>
  );
}

// ─── Tab: Unanswered ──────────────────────────────────────────────────────────
function TabUnanswered({ router }: { router: ReturnType<typeof useRouter> }) {
  const [items, setItems]         = useState<Unanswered[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [resolveTarget, setResolveTarget] = useState<Unanswered | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // GET /api/chatbot/unanswered
      const res = await fetch("/api/chatbot/unanswered", { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat (${res.status})`);
      const data: PaginatedUnanswered = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Pertanyaan Tak Terjawab</h2>
        <p className="text-sm text-slate-500 mt-0.5">{total} pertanyaan — jawab untuk menyimpan ke Knowledge Base</p>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

      <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-widest">
                <th className="px-5 py-4 text-left font-semibold">Pertanyaan</th>
                <th className="px-5 py-4 text-left font-semibold hidden sm:table-cell">IP</th>
                <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Waktu</th>
                <th className="px-5 py-4 text-right font-semibold w-36">Aksi</th>
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
                  <td colSpan={4} className="px-5 py-16 text-center text-slate-600">Tidak ada pertanyaan tak terjawab 🎉</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-slate-200 max-w-xs">
                      <p className="truncate" title={item.question}>{item.question}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-xs hidden sm:table-cell">{item.user_ip ?? "—"}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs hidden md:table-cell">
                      {new Date(item.asked_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        {item.is_resolved ? (
                          <span className="inline-flex px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg">✓ Selesai</span>
                        ) : (
                          <button
                            onClick={() => setResolveTarget(item)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-semibold transition-all"
                          >
                            ✏️ Jawab
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resolveTarget && (
        <ResolveModal
          item={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSave={() => { setResolveTarget(null); fetchData(); }}
        />
      )}
    </div>
  );
}

// ─── Tab: API Keys ────────────────────────────────────────────────────────────
function TabApiKeys({ router }: { router: ReturnType<typeof useRouter> }) {
  const [items, setItems]         = useState<ApiKey[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // GET /api/chatbot/api-keys (plural!)
      const res = await fetch("/api/chatbot/api-keys", { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat (${res.status})`);
      const data = await res.json();
      // Backend returns list directly (response_model=list[ApiKeyResponse])
      setItems(Array.isArray(data) ? data : (data.keys ?? []));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus API Key ini?")) return;
    setDeleting(id);
    try {
      // DELETE /api/chatbot/api-keys/{id} (plural!)
      const res = await fetch(`/api/chatbot/api-keys/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok && res.status !== 204) throw new Error("Gagal menghapus.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">API Keys Gemini</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pool key dengan rotasi otomatis</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all whitespace-nowrap shadow-[0_0_15px_rgba(220,38,38,0.25)]"
        >
          + Tambah Key
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

      <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-widest">
                <th className="px-5 py-4 text-left font-semibold">Label</th>
                <th className="px-5 py-4 text-left font-semibold">Preview</th>
                <th className="px-5 py-4 text-left font-semibold hidden sm:table-cell">Status</th>
                <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Requests</th>
                <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Prioritas</th>
                <th className="px-5 py-4 text-right font-semibold w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-600">Belum ada API Key. Tambahkan key pertama!</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-slate-200 font-medium">{item.label}</td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-xs">{item.key_preview}</td>
                    <td className="px-5 py-4 hidden sm:table-cell"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{item.total_requests.toLocaleString()}</td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{item.priority}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
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
      </div>

      {showModal && <ApiKeyModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData(); }} />}
    </div>
  );
}

// ─── Tab: Stats ───────────────────────────────────────────────────────────────
function TabStats({ router }: { router: ReturnType<typeof useRouter> }) {
  const [stats, setStats]       = useState<ChatbotStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // GET /api/chatbot/stats
      const res = await fetch("/api/chatbot/stats", { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Gagal memuat (${res.status})`);
      setStats(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async () => {
    if (!stats) return;
    setToggling(true);
    try {
      // PATCH /api/chatbot/stats/toggle (bukan /config!)
      const res = await fetch("/api/chatbot/stats/toggle", {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Gagal mengubah status.");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error.");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) return <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>;
  if (!stats) return null;

  // Field sesuai ChatbotStats schema: total_knowledge, total_unanswered, token_usage_pct
  const tokenPercent = stats.token_usage_pct ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Statistik Chatbot</h2>
          <p className="text-sm text-slate-500 mt-0.5">Penggunaan harian dan status sistem</p>
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all disabled:opacity-50 ${
            stats.is_active
              ? "bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white"
              : "bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white"
          }`}
        >
          {toggling ? "⏳" : stats.is_active ? "🔴 Matikan" : "🟢 Aktifkan"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Status Chatbot",    value: stats.is_active ? "🟢 Aktif" : "🔴 Mati",           sub: "Kill switch" },
          { label: "Knowledge Base",    value: stats.total_knowledge.toLocaleString(),               sub: "Entri terdaftar" },
          { label: "Tak Terjawab",      value: stats.total_unanswered.toLocaleString(),              sub: "Perlu ditinjau" },
          { label: "Token Hari Ini",    value: stats.tokens_used_today.toLocaleString(),             sub: `Limit: ${stats.daily_token_limit.toLocaleString()}` },
          { label: "Percakapan Hari Ini", value: stats.total_conversations_today.toLocaleString(), sub: "Sesi aktif hari ini" },
          { label: "Key Aktif / Gagal", value: `${stats.active_keys} / ${stats.failed_keys}`,       sub: "API key pool" },
        ].map((card) => (
          <div key={card.label} className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">{card.label}</p>
            <p className="text-xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-slate-600 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress bar token */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Penggunaan Token Harian</p>
          <p className="text-xs text-slate-500">
            {stats.tokens_used_today.toLocaleString()} / {stats.daily_token_limit.toLocaleString()} ({tokenPercent.toFixed(1)}%)
          </p>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${tokenPercent > 80 ? "bg-red-500" : tokenPercent > 50 ? "bg-orange-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, tokenPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────
type ChatbotTab = "knowledge" | "unanswered" | "apikeys" | "stats";

export default function KelolaChatbot() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ChatbotTab>("knowledge");

  const tabs: { id: ChatbotTab; label: string; icon: string }[] = [
    { id: "knowledge",  label: "Knowledge Base", icon: "🧠" },
    { id: "unanswered", label: "Tak Terjawab",   icon: "❓" },
    { id: "apikeys",    label: "API Keys",        icon: "🔑" },
    { id: "stats",      label: "Statistik",       icon: "📊" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">🤖 Kelola Chatbot Angie</h1>
        <p className="text-sm text-slate-500 mt-1">Manajemen knowledge base, API keys, dan monitoring chatbot</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-[#18181b] border border-white/5 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-red-600/10 text-red-400 border border-red-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "knowledge"  && <TabKnowledge  router={router} />}
      {activeTab === "unanswered" && <TabUnanswered router={router} />}
      {activeTab === "apikeys"    && <TabApiKeys    router={router} />}
      {activeTab === "stats"      && <TabStats      router={router} />}
    </div>
  );
}
