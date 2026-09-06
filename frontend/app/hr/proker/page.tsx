"use client";

import React, { useEffect, useState, useCallback } from "react";
import { prokerApi, type Proker } from "../../lib/hr-api";

const STATUS_KEHADIRAN_OPTIONS = ["Ditugaskan", "Hadir", "Tidak Hadir"];

function formatDate(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ---- Modal Create/Edit ----
function ProkerModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Proker;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nama.trim()) { setErr("Nama proker wajib diisi"); return; }
    setLoading(true);
    setErr(null);
    const payload = { nama: nama.trim(), deskripsi: deskripsi || undefined };
    const { error } = initial
      ? await prokerApi.update(initial.id, payload)
      : await prokerApi.create(payload);
    setLoading(false);
    if (error) { setErr(error); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">{initial ? "Edit Proker" : "Tambah Program Kerja"}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nama Program Kerja *</label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Festival Fotografi 2026"
              className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Deskripsi</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              placeholder="Deskripsi singkat proker..."
              className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 resize-none"
            />
          </div>
          {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-colors">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors"
            >
              {loading ? "Menyimpan..." : initial ? "Simpan" : "Tambah Proker"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Proker Detail Panel ----
function ProkerDetailPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof prokerApi.get>>["data"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prokerApi.get(id).then(({ data }) => {
      setDetail(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return <div className="flex-1 flex items-center justify-center text-slate-500">Data tidak ditemukan</div>;
  }

  return (
    <div className="flex-1 bg-[#18181B] border border-white/[0.06] rounded-2xl p-5 overflow-y-auto">
      <div className="flex items-start justify-between mb-4 gap-3">
        <h2 className="text-white font-semibold text-lg">{detail.nama}</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0">✕</button>
      </div>

      {detail.deskripsi && (
        <p className="text-slate-400 text-sm mb-5 leading-relaxed">{detail.deskripsi}</p>
      )}

      <div className="text-xs text-slate-500 mb-6">
        Dibuat: {formatDate(detail.created_at)}
      </div>

      {/* Medpart pivot */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Media Partner ({detail.medpart_assignments.length})
        </p>
        {detail.medpart_assignments.length === 0 ? (
          <p className="text-slate-600 text-sm">Belum ada medpart terhubung.</p>
        ) : (
          <div className="space-y-2">
            {detail.medpart_assignments.map((a) => (
              <div key={a.medpart_id} className="flex items-center justify-between bg-[#0E0E10] rounded-xl px-4 py-2.5">
                <span className="text-slate-300 text-sm">ID Medpart #{a.medpart_id}</span>
                {a.status_kehadiran && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-md">
                    {a.status_kehadiran}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sponsor pivot */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Sponsorship ({detail.sponsor_assignments.length})
        </p>
        {detail.sponsor_assignments.length === 0 ? (
          <p className="text-slate-600 text-sm">Belum ada sponsor terhubung.</p>
        ) : (
          <div className="space-y-2">
            {detail.sponsor_assignments.map((a) => (
              <div key={a.sponsor_id} className="flex items-center justify-between bg-[#0E0E10] rounded-xl px-4 py-2.5">
                <span className="text-slate-300 text-sm">ID Sponsor #{a.sponsor_id}</span>
                {a.status && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-md">
                    {a.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function ProkerPage() {
  const [prokers, setProkers] = useState<Proker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Proker | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await prokerApi.list({ limit: 100 });
    setLoading(false);
    if (data) { setProkers(data.data); setTotal(data.total); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus proker "${nama}"?`)) return;
    await prokerApi.delete(id);
    if (detailId === id) setDetailId(null);
    fetchAll();
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">📋 Program Kerja</h1>
          <p className="text-slate-400 text-sm">
            Kelola proker dan relasi pivot ke media partner &amp; sponsor.
          </p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal("create"); }}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <span>＋</span> Tambah Proker
        </button>
      </div>

      {/* Layout 70/30 */}
      <div className="flex gap-5">
        {/* List */}
        <div className={`flex flex-col gap-3 ${detailId ? "w-full md:w-[55%]" : "w-full"} transition-all`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500">{total} proker terdaftar</p>
          </div>

          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white/[0.04] rounded-2xl animate-pulse" />
            ))
          ) : prokers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="text-4xl mb-3">📋</span>
              <p className="font-medium">Belum ada program kerja</p>
            </div>
          ) : (
            prokers.map((p) => (
              <div
                key={p.id}
                onClick={() => setDetailId(p.id)}
                className={`bg-[#18181B] border rounded-2xl p-4 cursor-pointer transition-all ${
                  detailId === p.id
                    ? "border-red-500/30 bg-red-600/5"
                    : "border-white/[0.06] hover:border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm truncate">{p.nama}</p>
                    {p.deskripsi && (
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{p.deskripsi}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-1.5">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelected(p); setModal("edit"); }}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.nama)}
                      className="px-2.5 py-1.5 text-red-400 hover:text-white hover:bg-red-600/20 border border-red-500/20 rounded-lg text-xs transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {detailId && (
          <div className="hidden md:flex flex-col flex-1 min-h-[400px]">
            <ProkerDetailPanel id={detailId} onClose={() => setDetailId(null)} />
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === "create" || modal === "edit") && (
        <ProkerModal
          initial={modal === "edit" ? selected ?? undefined : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
