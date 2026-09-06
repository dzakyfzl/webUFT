"use client";

import React, { useState, useEffect, useCallback } from "react";
import { offerSponsorshipApi, offerKerjasamaApi, type OfferSponsorship, type OfferKerjasama } from "../../lib/hr-api";
import { getHRUser, hasAccess } from "../../lib/hr-auth";

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Negosiasi: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Deal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Diterima: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Ditolak: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_SPONSOR_OPTIONS = ["Pending", "Negosiasi", "Deal", "Ditolak"];
const STATUS_KERJASAMA_OPTIONS = ["Pending", "Negosiasi", "Diterima", "Ditolak"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
      {status}
    </span>
  );
}

function OfferSponsorTab() {
  const [items, setItems] = useState<OfferSponsorship[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nama_sponsor: "", nilai: "", bentuk_kerjasama: "", dokumen_link: "", syarat: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offerSponsorshipApi.list({ status: statusFilter || undefined, skip: page * LIMIT, limit: LIMIT });
    if (res.data) { setItems(res.data.data); setTotal(res.data.total); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setCreateError("");
    const res = await offerSponsorshipApi.create({
      nama_sponsor: createForm.nama_sponsor,
      nilai: createForm.nilai || undefined,
      bentuk_kerjasama: createForm.bentuk_kerjasama || undefined,
      dokumen_link: createForm.dokumen_link || undefined,
      syarat: createForm.syarat || undefined,
    } as Partial<OfferSponsorship>);
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setShowCreate(false); setCreateForm({ nama_sponsor: "", nilai: "", bentuk_kerjasama: "", dokumen_link: "", syarat: "" }); load();
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    await offerSponsorshipApi.update(id, { status: newStatus } as Partial<OfferSponsorship>);
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filter + Create */}
      <div className="px-6 py-4 flex gap-3 border-b border-white/[0.04]">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-slate-300 outline-none focus:border-red-500/50 transition-colors">
          <option value="">Semua Status</option>
          {STATUS_SPONSOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)}
          className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
          <span>➕</span> Tambah
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
              <div className="h-4 bg-white/[0.08] rounded w-36 animate-pulse" />
              <div className="ml-auto h-6 bg-white/[0.06] rounded-full w-20 animate-pulse" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <span className="text-4xl mb-3">📨</span>
            <p className="text-sm">Belum ada offer sponsorship masuk.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-medium text-white">{item.nama_sponsor}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.nilai && <p className="text-xs text-emerald-400 font-medium mb-1">💰 {item.nilai}</p>}
                  {item.bentuk_kerjasama && <p className="text-xs text-slate-400 mb-1 line-clamp-2">{item.bentuk_kerjasama}</p>}
                  {item.note && <p className="text-xs text-slate-500 italic line-clamp-1">&ldquo;{item.note}&rdquo;</p>}
                </div>
                {item.dokumen_link && (
                  <a href={item.dokumen_link} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:underline flex-shrink-0">Dokumen</a>
                )}
              </div>
              {/* Status buttons */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {STATUS_SPONSOR_OPTIONS.map((s) => (
                  <button key={s} onClick={() => handleStatusChange(item.id, s)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all ${item.status === s ? `${STATUS_BADGE[s]} cursor-default` : "border-white/[0.08] text-slate-500 hover:text-white"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-xs text-slate-500">Hal {page + 1}/{totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2.5 py-1 text-xs bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30">←</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30">→</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-white/[0.08] rounded-2xl shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Tambah Offer Sponsorship</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{createError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Sponsor *</label>
                <input required value={createForm.nama_sponsor} onChange={(e) => setCreateForm((f) => ({ ...f, nama_sponsor: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Nama perusahaan/brand..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nilai / Kompensasi</label>
                <input value={createForm.nilai} onChange={(e) => setCreateForm((f) => ({ ...f, nilai: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Rp 5.000.000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Bentuk Kerjasama</label>
                <textarea value={createForm.bentuk_kerjasama} onChange={(e) => setCreateForm((f) => ({ ...f, bentuk_kerjasama: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors resize-none"
                  placeholder="Detail bentuk kerjasama..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Link Dokumen</label>
                <input value={createForm.dokumen_link} onChange={(e) => setCreateForm((f) => ({ ...f, dokumen_link: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:text-white transition-colors">Batal</button>
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

function OfferKerjasamaTab() {
  const [items, setItems] = useState<OfferKerjasama[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nama_pengaju: "", kategori: "", kontak_person: "", deskripsi: "", nilai: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offerKerjasamaApi.list({ status: statusFilter || undefined, skip: page * LIMIT, limit: LIMIT });
    if (res.data) { setItems(res.data.data); setTotal(res.data.total); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setCreateError("");
    const res = await offerKerjasamaApi.create({
      nama_pengaju: createForm.nama_pengaju,
      kategori: createForm.kategori || undefined,
      kontak_person: createForm.kontak_person || undefined,
      deskripsi: createForm.deskripsi || undefined,
      nilai: createForm.nilai || undefined,
    } as Partial<OfferKerjasama>);
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setShowCreate(false); setCreateForm({ nama_pengaju: "", kategori: "", kontak_person: "", deskripsi: "", nilai: "" }); load();
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    await offerKerjasamaApi.update(id, { status: newStatus } as Partial<OfferKerjasama>);
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-6 py-4 flex gap-3 border-b border-white/[0.04]">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-slate-300 outline-none focus:border-red-500/50 transition-colors">
          <option value="">Semua Status</option>
          {STATUS_KERJASAMA_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)}
          className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
          <span>➕</span> Tambah
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
              <div className="h-4 bg-white/[0.08] rounded w-36 animate-pulse" />
              <div className="ml-auto h-6 bg-white/[0.06] rounded-full w-20 animate-pulse" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <span className="text-4xl mb-3">💼</span>
            <p className="text-sm">Belum ada offer kerjasama.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-white">{item.nama_pengaju}</p>
                    <StatusBadge status={item.status} />
                    {item.kategori && (
                      <span className="text-[10px] text-slate-500 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">
                        {item.kategori}
                      </span>
                    )}
                  </div>
                  {item.kontak_person && <p className="text-xs text-slate-400 mb-1">📞 {item.kontak_person}</p>}
                  {item.nilai && <p className="text-xs text-emerald-400 font-medium mb-1">💰 {item.nilai}</p>}
                  {item.deskripsi && <p className="text-xs text-slate-500 line-clamp-2">{item.deskripsi}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {STATUS_KERJASAMA_OPTIONS.map((s) => (
                  <button key={s} onClick={() => handleStatusChange(item.id, s)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all ${item.status === s ? `${STATUS_BADGE[s]} cursor-default` : "border-white/[0.08] text-slate-500 hover:text-white"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-xs text-slate-500">Hal {page + 1}/{totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2.5 py-1 text-xs bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30">←</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs bg-[#18181B] border border-white/[0.08] rounded-lg text-slate-400 disabled:opacity-30">→</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-white/[0.08] rounded-2xl shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Tambah Offer Kerjasama</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{createError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Pengaju *</label>
                <input required value={createForm.nama_pengaju} onChange={(e) => setCreateForm((f) => ({ ...f, nama_pengaju: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Nama individu / perusahaan..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kategori</label>
                  <input value={createForm.kategori} onChange={(e) => setCreateForm((f) => ({ ...f, kategori: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="Job Freelance..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kontak</label>
                  <input value={createForm.kontak_person} onChange={(e) => setCreateForm((f) => ({ ...f, kontak_person: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="No. WA..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nilai / Fee</label>
                <input value={createForm.nilai} onChange={(e) => setCreateForm((f) => ({ ...f, nilai: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Rp 2.000.000..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Deskripsi</label>
                <textarea value={createForm.deskripsi} onChange={(e) => setCreateForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors resize-none"
                  placeholder="Detail tawaran kerjasama..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:text-white transition-colors">Batal</button>
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

export default function OfferMasukPage() {
  const [activeTab, setActiveTab] = useState<"sponsorship" | "kerjasama">("sponsorship");
  const [hasOfferAccess, setHasOfferAccess] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const user = getHRUser();
    const access = hasAccess(user, "Kelola Offer Masuk");
    setHasOfferAccess(access);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!hasOfferAccess) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-600">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="text-base font-semibold text-slate-400 mb-1">Akses Terbatas</h2>
        <p className="text-sm">Halaman ini hanya dapat diakses oleh Kadiv / Wakadiv / Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06]">
        <h1 className="text-xl font-bold text-white">Offer Masuk</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tawaran sponsorship & kerjasama yang diterima.</p>
      </div>

      {/* Tabs */}
      <div className="px-6 md:px-8 pt-4 border-b border-white/[0.06] flex gap-1">
        {(["sponsorship", "kerjasama"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all capitalize border-b-2 -mb-px ${
              activeTab === tab
                ? "text-white border-red-500"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            {tab === "sponsorship" ? "📊 Sponsorship" : "💼 Kerjasama / Job"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "sponsorship" ? <OfferSponsorTab /> : <OfferKerjasamaTab />}
    </div>
  );
}
