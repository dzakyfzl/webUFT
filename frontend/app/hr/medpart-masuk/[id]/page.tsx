"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { medpartMasukApi, type MedpartMasukDetail, type AuditLog } from "../../../lib/hr-api";

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
      {status}
    </span>
  );
}

function AuditEntry({ log }: { log: AuditLog }) {
  return (
    <div className="flex gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="w-7 h-7 rounded-full bg-[#26262A] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs">
          {log.aksi === "created" ? "✨" : log.aksi === "deleted" ? "🗑️" : log.aksi.includes("status") ? "🔄" : log.aksi === "note_added" ? "💬" : "✏️"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 font-medium">{log.user_nama}</p>
        <p className="text-xs text-slate-500">
          {log.aksi.replace(/_/g, " ")}
          {log.field_key && log.nilai_lama && log.nilai_baru && (
            <span className="text-slate-600"> · {log.nilai_lama} → {log.nilai_baru}</span>
          )}
        </p>
        {log.nilai_baru && log.aksi === "note_added" && (
          <p className="text-xs text-slate-400 mt-1 italic truncate">&ldquo;{log.nilai_baru}&rdquo;</p>
        )}
        <p className="text-[10px] text-slate-600 mt-1">
          {new Date(log.created_at).toLocaleString("id-ID")}
        </p>
      </div>
      {log.via_ai && (
        <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full self-start">AI</span>
      )}
    </div>
  );
}

export default function MedpartMasukDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [data, setData] = useState<MedpartMasukDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await medpartMasukApi.get(id);
    if (res.data) {
      setData(res.data);
      setEditStatus(res.data.status);
    } else {
      setError(res.error || "Tidak ditemukan");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (newStatus: string) => {
    if (!data || newStatus === data.status) return;
    setSaving(true);
    const res = await medpartMasukApi.update(id, { status: newStatus });
    if (res.data) {
      setData((d) => d ? { ...d, status: newStatus } : d);
      setEditStatus(newStatus);
      // reload for audit log
      load();
    }
    setSaving(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    const res = await medpartMasukApi.addNote(id, noteText.trim());
    if (res.data) {
      setNoteText("");
      load();
    }
    setAddingNote(false);
  };

  const handleDelete = async () => {
    const res = await medpartMasukApi.delete(id);
    if (!res.error) {
      router.push("/hr/medpart-masuk");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-500">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-sm">{error || "Data tidak ditemukan."}</p>
        <button onClick={() => router.push("/hr/medpart-masuk")} className="mt-4 text-red-400 text-sm hover:underline">
          ← Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06] flex items-center gap-4">
        <button
          onClick={() => router.push("/hr/medpart-masuk")}
          className="text-slate-500 hover:text-white transition-colors text-sm"
        >
          ← Kembali
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{data.nama}</h1>
          <p className="text-slate-500 text-sm">ID #{data.id}</p>
        </div>
        <StatusBadge status={data.status} />
        {deleteConfirm ? (
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 text-xs text-slate-400 bg-white/[0.06] rounded-lg hover:text-white transition-colors">
              Batal
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors">
              Hapus
            </button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(true)} className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
            🗑️
          </button>
        )}
      </div>

      {/* Content: 70/30 layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: 70% - Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:border-r border-white/[0.06]">
          
          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Platform", value: data.platform || "—" },
              { label: "Kontak", value: data.kontak || "—" },
              { label: "Followers", value: data.jumlah_followers ? data.jumlah_followers.toLocaleString("id-ID") : "—" },
            ].map((field) => (
              <div key={field.label} className="bg-[#18181B] border border-white/[0.06] rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{field.label}</p>
                <p className="text-sm text-white font-medium">{field.value}</p>
              </div>
            ))}
          </div>

          {/* Link Bukti */}
          {data.link_bukti && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Link Bukti</p>
              <a href={data.link_bukti} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2">
                {data.link_bukti}
              </a>
            </div>
          )}

          {/* Syarat */}
          {data.syarat && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Syarat Kerjasama</p>
              <div className="bg-[#18181B] border border-white/[0.06] rounded-xl p-4">
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{data.syarat}</p>
              </div>
            </div>
          )}

          {/* Ubah Status */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving || data.status === s}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                    data.status === s
                      ? `${STATUS_BADGE[s]} cursor-default`
                      : "border-white/[0.08] text-slate-400 bg-white/[0.04] hover:text-white hover:bg-white/[0.08]"
                  } disabled:opacity-50`}
                >
                  {saving && editStatus === s ? "..." : s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Catatan</p>
            <div className="space-y-2 mb-4">
              {data.notes?.length === 0 && (
                <p className="text-sm text-slate-600 italic">Belum ada catatan.</p>
              )}
              {data.notes?.map((note) => (
                <div key={note.id} className="bg-[#18181B] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[10px] text-slate-600 mt-2">
                    {new Date(note.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddNote} className="flex gap-3">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Tambahkan catatan..."
                className="flex-1 px-4 py-2.5 bg-[#18181B] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={addingNote || !noteText.trim()}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-40"
              >
                {addingNote ? "..." : "Kirim"}
              </button>
            </form>
          </div>
        </div>

        {/* Right: 30% - Log Aktivitas */}
        <div className="lg:w-[300px] xl:w-[340px] flex-shrink-0 border-t lg:border-t-0 border-white/[0.06]">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Log Aktivitas</h3>
            <p className="text-xs text-slate-500">{data.audit_logs?.length || 0} entri</p>
          </div>
          <div className="overflow-y-auto h-[calc(100%-64px)] p-5">
            {(!data.audit_logs || data.audit_logs.length === 0) ? (
              <p className="text-xs text-slate-600 italic">Belum ada aktivitas tercatat.</p>
            ) : (
              data.audit_logs.map((log) => <AuditEntry key={log.id} log={log} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
