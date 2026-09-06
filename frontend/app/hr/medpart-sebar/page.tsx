"use client";

import React, { useState, useEffect, useCallback } from "react";
import { medpartSebarApi, type MedpartSebar } from "../../lib/hr-api";

const STATUS_BADGE: Record<string, string> = {
  Aktif: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Nonaktif: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  Blacklist: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
      {status}
    </span>
  );
}

function BayarBadge({ berbayar }: { berbayar: boolean }) {
  return berbayar ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
      💰 Berbayar
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
      ✓ Gratis
    </span>
  );
}

export default function MedpartSebarPage() {
  const [items, setItems] = useState<MedpartSebar[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    nama: "", platform: "", kontak: "", jumlah_followers: "",
    link_akun: "", syarat_berbayar: false, harga: "", syarat_detail: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await medpartSebarApi.list({
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
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await medpartSebarApi.create({
      nama: createForm.nama,
      platform: createForm.platform || undefined,
      kontak: createForm.kontak || undefined,
      jumlah_followers: createForm.jumlah_followers ? Number(createForm.jumlah_followers) : undefined,
      link_akun: createForm.link_akun || undefined,
      syarat_berbayar: createForm.syarat_berbayar,
      harga: createForm.harga || undefined,
      syarat_detail: createForm.syarat_detail || undefined,
    } as Partial<MedpartSebar>);
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setShowCreate(false);
    setCreateForm({ nama: "", platform: "", kontak: "", jumlah_followers: "", link_akun: "", syarat_berbayar: false, harga: "", syarat_detail: "" });
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Medpart Sebar</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} total record</p>
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
          <option value="Aktif">Aktif</option>
          <option value="Nonaktif">Nonaktif</option>
          <option value="Blacklist">Blacklist</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="hidden sm:grid grid-cols-[1fr_110px_130px_120px_90px] gap-4 px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest border-b border-white/[0.04]">
          <span>Media Partner</span>
          <span>Platform</span>
          <span>Followers</span>
          <span>Syarat</span>
          <span>Status</span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
              <div className="h-4 bg-white/[0.08] rounded w-36 animate-pulse" />
              <div className="ml-auto h-6 bg-white/[0.06] rounded-full w-16 animate-pulse" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <span className="text-4xl mb-3">📭</span>
            <p className="text-sm">Belum ada data medpart sebar.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="grid sm:grid-cols-[1fr_110px_130px_120px_90px] gap-4 items-center px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.nama}</p>
                {item.link_akun && (
                  <a href={item.link_akun} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline truncate block max-w-xs">
                    {item.link_akun}
                  </a>
                )}
              </div>
              <p className="text-sm text-slate-400 hidden sm:block">{item.platform || "—"}</p>
              <p className="text-sm text-slate-400 hidden sm:block">
                {item.jumlah_followers ? item.jumlah_followers.toLocaleString("id-ID") : "—"}
              </p>
              <div className="hidden sm:block">
                <BayarBadge berbayar={item.syarat_berbayar} />
                {item.harga && <p className="text-xs text-slate-500 mt-1">{item.harga}</p>}
              </div>
              <div className="hidden sm:block">
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))
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
          <div className="w-full max-w-lg bg-[#18181B] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#18181B]">
              <h2 className="text-base font-bold text-white">Tambah Medpart Sebar</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{createError}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Medpart *</label>
                <input required value={createForm.nama} onChange={(e) => setCreateForm((f) => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Nama media partner..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Platform</label>
                  <input value={createForm.platform} onChange={(e) => setCreateForm((f) => ({ ...f, platform: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="Instagram..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Followers</label>
                  <input type="number" value={createForm.jumlah_followers} onChange={(e) => setCreateForm((f) => ({ ...f, jumlah_followers: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="10000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kontak</label>
                <input value={createForm.kontak} onChange={(e) => setCreateForm((f) => ({ ...f, kontak: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="No. WA / email..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Link Akun</label>
                <input value={createForm.link_akun} onChange={(e) => setCreateForm((f) => ({ ...f, link_akun: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="https://instagram.com/..." />
              </div>
              {/* Berbayar toggle */}
              <div className="flex items-center gap-3 p-4 bg-[#222226] rounded-xl border border-white/[0.06]">
                <label className="relative flex items-center cursor-pointer">
                  <input type="checkbox" checked={createForm.syarat_berbayar}
                    onChange={(e) => setCreateForm((f) => ({ ...f, syarat_berbayar: e.target.checked }))}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-700 rounded-full peer-checked:bg-red-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <div>
                  <p className="text-sm text-white font-medium">Berbayar</p>
                  <p className="text-xs text-slate-500">Aktifkan jika medpart ini berbayar</p>
                </div>
              </div>
              {createForm.syarat_berbayar && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Harga / Kompensasi</label>
                  <input value={createForm.harga} onChange={(e) => setCreateForm((f) => ({ ...f, harga: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="Rp 500.000 / posting" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Syarat Detail</label>
                <textarea value={createForm.syarat_detail} onChange={(e) => setCreateForm((f) => ({ ...f, syarat_detail: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors resize-none"
                  placeholder="Detail syarat kerjasama sebar..." />
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
