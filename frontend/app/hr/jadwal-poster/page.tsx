"use client";

import React, { useState, useEffect, useCallback } from "react";
import { jadwalPosterApi, type JadwalPoster } from "../../lib/hr-api";
import { useSearchParams } from "next/navigation";

const STATUS_BADGE: Record<string, string> = {
  "Belum Jadwal": "bg-slate-500/15 text-slate-400 border-slate-500/30",
  "Terjadwal": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Sudah Upload": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Telat": "bg-red-500/25 text-red-400 border-red-500/40",
};

function StatusBadge({ status }: { status: string }) {
  const isOverdue = status === "Telat";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30"} ${isOverdue ? "animate-pulse" : ""}`}>
      {isOverdue && "🔴 "}
      {status}
    </span>
  );
}

function formatDeadline(dt: string): { text: string; isOverdue: boolean; isSoon: boolean } {
  const now = new Date();
  const d = new Date(dt);
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) return { text: `${Math.abs(days)}h lalu`, isOverdue: true, isSoon: false };
  if (days === 0) return { text: "Hari ini!", isOverdue: false, isSoon: true };
  if (days <= 3) return { text: `${days} hari lagi`, isOverdue: false, isSoon: true };
  return { text: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }), isOverdue: false, isSoon: false };
}

export default function JadwalPosterPage() {
  const searchParams = useSearchParams();
  const initialOverdue = searchParams.get("overdue") === "1";

  const [items, setItems] = useState<JadwalPoster[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ medpart_id: "", tanggal_deadline: "", catatan: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await jadwalPosterApi.list({
      status: statusFilter || undefined,
      overdue_only: overdueOnly || undefined,
      skip: page * LIMIT,
      limit: LIMIT,
    });
    if (res.data) {
      setItems(res.data.data);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [statusFilter, overdueOnly, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [statusFilter, overdueOnly]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await jadwalPosterApi.create({
      medpart_id: Number(createForm.medpart_id),
      tanggal_deadline: createForm.tanggal_deadline,
      catatan: createForm.catatan || undefined,
    } as Partial<JadwalPoster>);
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setShowCreate(false);
    setCreateForm({ medpart_id: "", tanggal_deadline: "", catatan: "" });
    load();
  };

  const handleMarkUpload = async (id: number) => {
    await jadwalPosterApi.update(id, { status: "Sudah Upload" } as Partial<JadwalPoster>);
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Jadwal Poster</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} jadwal ditemukan</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="sm:ml-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 w-fit"
        >
          <span>➕</span> Tambah
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 md:px-8 py-4 flex flex-col sm:flex-row gap-3 border-b border-white/[0.04]">
        <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border cursor-pointer transition-all ${overdueOnly ? "bg-red-600/15 border-red-500/30 text-red-400" : "bg-[#18181B] border-white/[0.08] text-slate-400 hover:text-white"}`}>
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="sr-only" />
          <span className="text-sm font-medium">🔴 Overdue saja</span>
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-slate-300 outline-none focus:border-red-500/50 transition-colors"
        >
          <option value="">Semua Status</option>
          <option value="Belum Jadwal">Belum Jadwal</option>
          <option value="Terjadwal">Terjadwal</option>
          <option value="Sudah Upload">Sudah Upload</option>
          <option value="Telat">Telat</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="hidden sm:grid grid-cols-[60px_1fr_160px_160px_120px_80px] gap-4 px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest border-b border-white/[0.04]">
          <span>ID</span>
          <span>Medpart</span>
          <span>Deadline</span>
          <span>Catatan</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
              <div className="h-4 bg-white/[0.08] rounded w-12 animate-pulse" />
              <div className="h-4 bg-white/[0.08] rounded w-32 animate-pulse" />
              <div className="ml-auto h-6 bg-white/[0.06] rounded-full w-20 animate-pulse" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <span className="text-4xl mb-3">{overdueOnly ? "✅" : "📅"}</span>
            <p className="text-sm">{overdueOnly ? "Tidak ada jadwal overdue!" : "Belum ada jadwal poster."}</p>
          </div>
        ) : (
          items.map((item) => {
            const deadline = formatDeadline(item.tanggal_deadline);
            const isOverdue = item.status === "Telat" || deadline.isOverdue;
            return (
              <div
                key={item.id}
                className={`grid sm:grid-cols-[60px_1fr_160px_160px_120px_80px] gap-4 items-center px-5 py-4 border-b transition-colors ${
                  isOverdue
                    ? "border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.07] row-overdue"
                    : "border-white/[0.04] hover:bg-white/[0.03]"
                }`}
              >
                <p className="text-xs text-slate-600 font-mono">#{item.id}</p>
                <div>
                  <p className="text-sm font-medium text-white">MP #{item.medpart_id}</p>
                  {item.proker_id && <p className="text-xs text-slate-500">Proker #{item.proker_id}</p>}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isOverdue ? "text-red-400" : deadline.isSoon ? "text-amber-400" : "text-slate-300"}`}>
                    {deadline.text}
                  </p>
                  <p className="text-xs text-slate-600">
                    {new Date(item.tanggal_deadline).toLocaleString("id-ID")}
                  </p>
                </div>
                <p className="text-sm text-slate-400 hidden sm:block truncate">{item.catatan || "—"}</p>
                <StatusBadge status={item.status} />
                {item.status !== "Sudah Upload" && (
                  <button
                    onClick={() => handleMarkUpload(item.id)}
                    className="hidden sm:block px-2 py-1 text-[10px] font-semibold text-white bg-emerald-600/80 hover:bg-emerald-500 rounded-lg transition-colors"
                  >
                    ✓ Upload
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-sm text-slate-500">Hal {page + 1} / {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-sm bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30 hover:text-white transition-colors">←</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30 hover:text-white transition-colors">→</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-white/[0.08] rounded-2xl shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Tambah Jadwal Poster</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{createError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ID Medpart Masuk *</label>
                <input required type="number" value={createForm.medpart_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, medpart_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="ID medpart..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tanggal Deadline *</label>
                <input required type="datetime-local" value={createForm.tanggal_deadline}
                  onChange={(e) => setCreateForm((f) => ({ ...f, tanggal_deadline: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catatan</label>
                <textarea value={createForm.catatan} onChange={(e) => setCreateForm((f) => ({ ...f, catatan: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors resize-none"
                  placeholder="Catatan jadwal poster..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:text-white transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50">
                  {creating ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
