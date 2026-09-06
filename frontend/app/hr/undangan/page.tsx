"use client";

import React, { useEffect, useState, useCallback } from "react";
import { undanganApi, type Undangan, type UndanganDetail } from "../../lib/hr-api";

const STATUS_OPTIONS = ["Baru", "Dikonfirmasi", "Ditolak", "Selesai"];
const KEHADIRAN_OPTIONS = ["Ditugaskan", "Hadir", "Tidak Hadir"];

const STATUS_COLORS: Record<string, string> = {
  Baru: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Dikonfirmasi: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Ditolak: "bg-red-500/15 text-red-400 border-red-500/20",
  Selesai: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const KEHADIRAN_COLORS: Record<string, string> = {
  Ditugaskan: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Hadir: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Tidak Hadir": "bg-red-500/15 text-red-400 border-red-500/20",
};

function formatDate(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20";
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs rounded-md border font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ---- Modal Create/Edit ----
function UndanganModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Undangan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nama_acara: initial?.nama_acara ?? "",
    pengundang: initial?.pengundang ?? "",
    tanggal: initial?.tanggal ? initial.tanggal.slice(0, 16) : "",
    lokasi: initial?.lokasi ?? "",
    deadline_konfirmasi: initial?.deadline_konfirmasi ? initial.deadline_konfirmasi.slice(0, 16) : "",
    status: initial?.status ?? "Baru",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    if (!form.nama_acara.trim()) { setErr("Nama acara wajib diisi"); return; }
    setLoading(true);
    setErr(null);
    const payload = {
      nama_acara: form.nama_acara.trim(),
      pengundang: form.pengundang || undefined,
      tanggal: form.tanggal ? new Date(form.tanggal).toISOString() : undefined,
      lokasi: form.lokasi || undefined,
      deadline_konfirmasi: form.deadline_konfirmasi ? new Date(form.deadline_konfirmasi).toISOString() : undefined,
      status: initial ? form.status : undefined,
    };
    const { error } = initial
      ? await undanganApi.update(initial.id, payload)
      : await undanganApi.create(payload);
    setLoading(false);
    if (error) { setErr(error); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">{initial ? "Edit Undangan" : "Tambah Undangan"}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {[
            { label: "Nama Acara *", key: "nama_acara" as const, type: "text", placeholder: "Festival Fotografi..." },
            { label: "Pengundang", key: "pengundang" as const, type: "text", placeholder: "Nama organisasi / instansi" },
            { label: "Tanggal Acara", key: "tanggal" as const, type: "datetime-local", placeholder: "" },
            { label: "Lokasi", key: "lokasi" as const, type: "text", placeholder: "Venue / Link online" },
            { label: "Deadline Konfirmasi", key: "deadline_konfirmasi" as const, type: "datetime-local", placeholder: "" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
              />
            </div>
          ))}
          {initial && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={set("status")}
                className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
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
              {loading ? "Menyimpan..." : initial ? "Simpan" : "Tambah"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Detail Panel ----
function UndanganDetailPanel({ id, onClose, onRefresh }: { id: number; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<UndanganDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignId, setAssignId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    const { data } = await undanganApi.get(id);
    setDetail(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleAssign = async () => {
    const aid = parseInt(assignId);
    if (!aid) return;
    setAssigning(true);
    await undanganApi.assign(id, aid);
    setAssignId("");
    setAssigning(false);
    fetchDetail();
  };

  const handleUpdateKehadiran = async (akun_id: number, status: string) => {
    await undanganApi.updateKehadiran(id, akun_id, status);
    fetchDetail();
  };

  const handleUnassign = async (akun_id: number) => {
    if (!confirm("Hapus assignee ini?")) return;
    await undanganApi.unassign(id, akun_id);
    fetchDetail();
    onRefresh();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!detail) return null;

  return (
    <div className="flex-1 bg-[#18181B] border border-white/[0.06] rounded-2xl overflow-y-auto">
      <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-base truncate">{detail.nama_acara}</p>
          <StatusBadge status={detail.status} />
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 ml-3">✕</button>
      </div>

      <div className="p-5 space-y-5">
        {/* Info */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Pengundang", value: detail.pengundang },
            { label: "Tanggal", value: formatDate(detail.tanggal) },
            { label: "Lokasi", value: detail.lokasi },
            { label: "Deadline Konfirmasi", value: formatDate(detail.deadline_konfirmasi) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0E0E10] rounded-xl p-3">
              <p className="text-slate-500 text-xs mb-1">{label}</p>
              <p className="text-white text-sm">{value ?? "-"}</p>
            </div>
          ))}
        </div>

        {/* Assignees */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Peserta ({detail.assignments.length})
          </p>
          {detail.assignments.length === 0 ? (
            <p className="text-slate-600 text-sm">Belum ada peserta ditugaskan.</p>
          ) : (
            <div className="space-y-2">
              {detail.assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 bg-[#0E0E10] rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs flex-shrink-0">
                    #{a.akun_id}
                  </div>
                  <span className="text-slate-300 text-sm flex-1">Akun #{a.akun_id}</span>
                  <select
                    value={a.status_kehadiran ?? "Ditugaskan"}
                    onChange={(e) => handleUpdateKehadiran(a.akun_id, e.target.value)}
                    className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    {KEHADIRAN_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <button
                    onClick={() => handleUnassign(a.akun_id)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Assign form */}
          <div className="flex gap-2 mt-3">
            <input
              type="number"
              value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
              placeholder="Akun ID"
              className="flex-1 bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleAssign}
              disabled={assigning || !assignId}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-colors font-medium"
            >
              Tugaskan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function UndanganPage() {
  const [undangan, setUndangan] = useState<Undangan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Undangan | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await undanganApi.list({ status: statusFilter || undefined, limit: 100 });
    setLoading(false);
    if (data) { setUndangan(data.data); setTotal(data.total); }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus undangan "${nama}"?`)) return;
    await undanganApi.delete(id);
    if (detailId === id) setDetailId(null);
    fetchAll();
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">✉️ Undangan Acara</h1>
          <p className="text-slate-400 text-sm">Kelola undangan kegiatan eksternal dan penugasan anggota.</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal("create"); }}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <span>＋</span> Tambah Undangan
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter === s
                ? "bg-red-600/20 text-red-400 border-red-500/30"
                : "text-slate-400 border-white/[0.06] hover:border-white/20 hover:text-white"
            }`}
          >
            {s || "Semua"} {s && `(${undangan.filter((u) => u.status === s).length})`}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{total} undangan</span>
      </div>

      {/* Layout */}
      <div className="flex gap-5">
        <div className={`flex flex-col gap-3 ${detailId ? "w-full md:w-[55%]" : "w-full"}`}>
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/[0.04] rounded-2xl animate-pulse" />)
          ) : undangan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="text-4xl mb-3">✉️</span>
              <p className="font-medium">Belum ada undangan</p>
            </div>
          ) : (
            undangan.map((u) => (
              <div
                key={u.id}
                onClick={() => setDetailId(u.id)}
                className={`bg-[#18181B] border rounded-2xl p-4 cursor-pointer transition-all ${
                  detailId === u.id
                    ? "border-red-500/30 bg-red-600/5"
                    : "border-white/[0.06] hover:border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-white font-medium text-sm truncate">{u.nama_acara}</p>
                      <StatusBadge status={u.status} />
                    </div>
                    {u.pengundang && <p className="text-slate-500 text-xs">dari {u.pengundang}</p>}
                    <p className="text-slate-600 text-xs mt-1">
                      {u.tanggal ? `📅 ${formatDate(u.tanggal)}` : "Tanggal belum ditentukan"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelected(u); setModal("edit"); }}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.nama_acara)}
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

        {detailId && (
          <div className="hidden md:flex flex-col flex-1 min-h-[400px]">
            <UndanganDetailPanel id={detailId} onClose={() => setDetailId(null)} onRefresh={fetchAll} />
          </div>
        )}
      </div>

      {(modal === "create" || modal === "edit") && (
        <UndanganModal
          initial={modal === "edit" ? selected ?? undefined : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
