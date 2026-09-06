"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { medpartMasukApi, type MedpartMasuk } from "../../lib/hr-api";

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        STATUS_BADGE[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30"
      }`}
    >
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
      <div className="h-4 bg-white/[0.08] rounded w-32 animate-pulse" />
      <div className="h-4 bg-white/[0.06] rounded w-20 animate-pulse" />
      <div className="ml-auto h-6 bg-white/[0.06] rounded-full w-16 animate-pulse" />
    </div>
  );
}

export default function MedpartMasukPage() {
  const [items, setItems] = useState<MedpartMasuk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nama: "", platform: "", kontak: "", jumlah_followers: "", link_bukti: "", syarat: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await medpartMasukApi.list({
      search: search || undefined,
      status: statusFilter || undefined,
      skip: page * LIMIT,
      limit: LIMIT,
    });
    if (res.data) {
      setItems(res.data.data);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Re-search ketika search/filter berubah, reset page
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await medpartMasukApi.create({
      nama: createForm.nama,
      platform: createForm.platform || undefined,
      kontak: createForm.kontak || undefined,
      jumlah_followers: createForm.jumlah_followers ? Number(createForm.jumlah_followers) : undefined,
      link_bukti: createForm.link_bukti || undefined,
      syarat: createForm.syarat || undefined,
    });
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setShowCreate(false);
    setCreateForm({ nama: "", platform: "", kontak: "", jumlah_followers: "", link_bukti: "", syarat: "" });
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Medpart Masuk</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} total record</p>
        </div>
        <div className="sm:ml-auto flex gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <span>➕</span> Tambah
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 md:px-8 py-4 flex flex-col sm:flex-row gap-3 border-b border-white/[0.04]">
        <input
          type="search"
          placeholder="Cari nama, platform, kontak..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/50 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-slate-300 outline-none focus:border-red-500/50 transition-colors"
        >
          <option value="">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_120px_150px_100px_100px] gap-4 px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest border-b border-white/[0.04]">
          <span>Media Partner</span>
          <span>Platform</span>
          <span>Kontak</span>
          <span>Followers</span>
          <span>Status</span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <span className="text-4xl mb-3">📭</span>
            <p className="text-sm">Belum ada data medpart masuk.</p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/hr/medpart-masuk/${item.id}`}
              className="grid sm:grid-cols-[1fr_120px_150px_100px_100px] gap-4 items-center px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.nama}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {new Date(item.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <p className="text-sm text-slate-400 hidden sm:block">{item.platform || "—"}</p>
              <p className="text-sm text-slate-400 hidden sm:block truncate">{item.kontak || "—"}</p>
              <p className="text-sm text-slate-400 hidden sm:block">
                {item.jumlah_followers ? item.jumlah_followers.toLocaleString("id-ID") : "—"}
              </p>
              <div className="hidden sm:block">
                <StatusBadge status={item.status} />
              </div>
              {/* Mobile: status badge */}
              <div className="sm:hidden mt-1">
                <StatusBadge status={item.status} />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Hal {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-white/[0.08] rounded-2xl shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Tambah Medpart Masuk</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Medpart *</label>
                <input
                  required
                  value={createForm.nama}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Nama media partner..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Platform</label>
                  <input
                    value={createForm.platform}
                    onChange={(e) => setCreateForm((f) => ({ ...f, platform: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="Instagram..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Followers</label>
                  <input
                    type="number"
                    value={createForm.jumlah_followers}
                    onChange={(e) => setCreateForm((f) => ({ ...f, jumlah_followers: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="10000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kontak</label>
                <input
                  value={createForm.kontak}
                  onChange={(e) => setCreateForm((f) => ({ ...f, kontak: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="No. WA / email..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Link Bukti Follow</label>
                <input
                  value={createForm.link_bukti}
                  onChange={(e) => setCreateForm((f) => ({ ...f, link_bukti: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Syarat</label>
                <textarea
                  value={createForm.syarat}
                  onChange={(e) => setCreateForm((f) => ({ ...f, syarat: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors resize-none"
                  placeholder="Detail syarat kerjasama..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50"
                >
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
