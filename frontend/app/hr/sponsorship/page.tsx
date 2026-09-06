"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sponsorshipApi, type Sponsor, type SponsorDetail } from "../../lib/hr-api";

const STATUS_BADGE: Record<string, string> = {
  Prospek: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  "Proposal Terkirim": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Nego: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Deal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Ditolak: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_OPTIONS = ["Prospek", "Proposal Terkirim", "Nego", "Deal", "Ditolak"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
      {status}
    </span>
  );
}

function SponsorDetailPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<SponsorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    sponsorshipApi.get(id).then((res) => {
      if (res.data) setData(res.data);
      setLoading(false);
    });
  }, [id]);

  const reload = () => {
    setLoading(true);
    sponsorshipApi.get(id).then((res) => {
      if (res.data) setData(res.data);
      setLoading(false);
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!data || newStatus === data.status) return;
    setSavingStatus(true);
    await sponsorshipApi.update(id, { status: newStatus } as Partial<Sponsor>);
    setSavingStatus(false);
    reload();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    await sponsorshipApi.addNote(id, noteText.trim());
    setNoteText("");
    setAddingNote(false);
    reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <button onClick={onClose} className="text-slate-500 hover:text-white text-lg transition-colors">←</button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white truncate">{data.nama_perusahaan}</h3>
          <p className="text-xs text-slate-500">#{data.id}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* CP Info */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Contact Person</p>
          <div className="space-y-2">
            {[
              { label: "Nama", value: data.cp_nama },
              { label: "Jabatan", value: data.cp_jabatan },
              { label: "WhatsApp", value: data.cp_wa },
              { label: "Email", value: data.cp_email },
            ].map((f) => f.value && (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-16">{f.label}</span>
                <span className="text-sm text-white">{f.value}</span>
              </div>
            ))}
            {!data.cp_nama && !data.cp_wa && (
              <p className="text-sm text-slate-600 italic">Belum ada kontak.</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => handleStatusChange(s)} disabled={savingStatus || data.status === s}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${data.status === s ? `${STATUS_BADGE[s]} cursor-default` : "border-white/[0.08] text-slate-400 bg-white/[0.04] hover:text-white"} disabled:opacity-50`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Proposals */}
        {data.proposals?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Riwayat Proposal ({data.proposals.length})</p>
            <div className="space-y-2">
              {data.proposals.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-[#222226] rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">{new Date(p.tanggal_kirim).toLocaleDateString("id-ID")}</p>
                    {p.versi && <p className="text-[10px] text-slate-500">{p.versi}</p>}
                  </div>
                  {p.link_file && (
                    <a href={p.link_file} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:underline">Lihat File</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offers */}
        {data.offers?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Sub-Offer ({data.offers.length})</p>
            <div className="space-y-2">
              {data.offers.map((o) => (
                <div key={o.id} className="p-3 bg-[#222226] rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-white font-medium">{o.nilai || "—"}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  {o.bentuk_kerjasama && <p className="text-xs text-slate-400">{o.bentuk_kerjasama}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Catatan</p>
          <div className="space-y-2 mb-3">
            {!data.notes?.length && <p className="text-xs text-slate-600 italic">Belum ada catatan.</p>}
            {data.notes?.map((n) => (
              <div key={n.id} className="p-3 bg-[#222226] rounded-xl">
                <p className="text-xs text-slate-300">{n.content}</p>
                <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleString("id-ID")}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Catatan..."
              className="flex-1 px-3 py-2 bg-[#222226] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-600 outline-none focus:border-red-500/50 transition-colors" />
            <button type="submit" disabled={addingNote || !noteText.trim()}
              className="px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-40">
              {addingNote ? "..." : "Kirim"}
            </button>
          </form>
        </div>

        {/* Audit */}
        {data.audit_logs?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Log Aktivitas</p>
            <div className="space-y-2">
              {data.audit_logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium">{log.user_nama}</p>
                    <p className="text-[10px] text-slate-600">{log.aksi.replace(/_/g, " ")}</p>
                  </div>
                  <p className="text-[9px] text-slate-700 flex-shrink-0">{new Date(log.created_at).toLocaleDateString("id-ID")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SponsorshipPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nama_perusahaan: "", cp_nama: "", cp_wa: "", cp_email: "", cp_jabatan: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await sponsorshipApi.list({ status: statusFilter || undefined, skip: page * LIMIT, limit: LIMIT });
    if (res.data) { setItems(res.data.data); setTotal(res.data.total); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setCreateError("");
    const res = await sponsorshipApi.create({
      nama_perusahaan: createForm.nama_perusahaan,
      cp_nama: createForm.cp_nama || undefined,
      cp_wa: createForm.cp_wa || undefined,
      cp_email: createForm.cp_email || undefined,
      cp_jabatan: createForm.cp_jabatan || undefined,
    } as Partial<Sponsor>);
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setShowCreate(false);
    setCreateForm({ nama_perusahaan: "", cp_nama: "", cp_wa: "", cp_email: "", cp_jabatan: "" });
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex h-full">
      {/* List Panel */}
      <div className={`flex flex-col ${selectedId ? "hidden lg:flex lg:w-[55%]" : "w-full"} border-r border-white/[0.06]`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Sponsorship</h1>
            <p className="text-slate-500 text-sm mt-0.5">{total} sponsor</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
            <span>➕</span> Tambah
          </button>
        </div>

        {/* Filter */}
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-slate-300 outline-none focus:border-red-500/50 transition-colors">
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
                <div className="h-4 bg-white/[0.08] rounded w-36 animate-pulse" />
                <div className="ml-auto h-6 bg-white/[0.06] rounded-full w-20 animate-pulse" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <span className="text-4xl mb-3">🤝</span>
              <p className="text-sm">Belum ada data sponsor.</p>
            </div>
          ) : (
            items.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors text-left ${item.id === selectedId ? "bg-white/[0.05] border-l-2 border-l-red-500" : ""}`}>
                <div className="w-9 h-9 rounded-xl bg-[#26262A] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{item.nama_perusahaan.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.nama_perusahaan}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {new Date(item.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
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
      </div>

      {/* Detail Panel */}
      {selectedId && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <SponsorDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {/* Empty detail state (desktop) */}
      {!selectedId && (
        <div className="hidden lg:flex flex-1 items-center justify-center text-slate-600 flex-col gap-3">
          <span className="text-4xl">👈</span>
          <p className="text-sm">Pilih sponsor untuk melihat detail</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-white/[0.08] rounded-2xl shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Tambah Sponsor</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{createError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Perusahaan *</label>
                <input required value={createForm.nama_perusahaan} onChange={(e) => setCreateForm((f) => ({ ...f, nama_perusahaan: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  placeholder="PT. Contoh Perusahaan..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama CP</label>
                  <input value={createForm.cp_nama} onChange={(e) => setCreateForm((f) => ({ ...f, cp_nama: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="Budi..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Jabatan</label>
                  <input value={createForm.cp_jabatan} onChange={(e) => setCreateForm((f) => ({ ...f, cp_jabatan: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="Marketing..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">WhatsApp</label>
                  <input value={createForm.cp_wa} onChange={(e) => setCreateForm((f) => ({ ...f, cp_wa: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="0812..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
                  <input value={createForm.cp_email} onChange={(e) => setCreateForm((f) => ({ ...f, cp_email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#222226] border border-white/[0.08] rounded-xl text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                    placeholder="email@..." />
                </div>
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
