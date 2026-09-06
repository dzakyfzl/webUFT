"use client";

import React, { useEffect, useState, useCallback } from "react";
import { reminderApi, type Reminder, type ReminderDashboard } from "../../lib/hr-api";

const JENIS_OPTIONS = ["undangan", "poster", "aspirasi", "manual"];
const STATUS_OPTIONS = ["Aktif", "Selesai", "Overdue"];

const JENIS_ICONS: Record<string, string> = {
  undangan: "✉️",
  poster: "📅",
  aspirasi: "💡",
  manual: "📝",
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function daysDiff(dt: string) {
  const diff = new Date(dt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ReminderCard({
  r,
  onDone,
  onDelete,
  variant,
}: {
  r: Reminder;
  onDone: (id: number) => void;
  onDelete: (id: number) => void;
  variant: "overdue" | "mendekati" | "akan_datang" | "normal";
}) {
  const days = daysDiff(r.tanggal_deadline);
  const variantConfig = {
    overdue: {
      border: "border-red-500/30",
      bg: "bg-red-600/5",
      badge: "bg-red-500/15 text-red-400 border-red-500/20",
      badgeText: `${Math.abs(days)} hari terlambat`,
    },
    mendekati: {
      border: "border-amber-500/30",
      bg: "bg-amber-600/5",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      badgeText: `${days} hari lagi`,
    },
    akan_datang: {
      border: "border-white/[0.06]",
      bg: "",
      badge: "bg-slate-500/15 text-slate-400 border-slate-500/20",
      badgeText: `${days} hari lagi`,
    },
    normal: {
      border: "border-white/[0.06]",
      bg: "",
      badge: "bg-slate-500/15 text-slate-400 border-slate-500/20",
      badgeText: r.status,
    },
  };
  const cfg = variantConfig[variant];

  return (
    <div
      className={`bg-[#18181B] border ${cfg.border} ${cfg.bg} rounded-2xl p-4 flex items-start gap-3`}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">
        {JENIS_ICONS[r.jenis] ?? "🔔"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium line-clamp-1">
          {r.judul ?? `${r.jenis} #${r.referensi_id}`}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 text-xs rounded-md border ${cfg.badge}`}>
            {cfg.badgeText}
          </span>
          <span className="text-slate-500 text-xs">{formatDate(r.tanggal_deadline)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {r.status !== "Selesai" && (
          <button
            onClick={() => onDone(r.id)}
            className="px-2.5 py-1.5 text-xs bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg font-medium transition-colors"
          >
            ✓ Selesai
          </button>
        )}
        <button
          onClick={() => onDelete(r.id)}
          className="px-2.5 py-1.5 text-xs text-red-400 hover:text-white hover:bg-red-600/20 border border-red-500/20 rounded-lg transition-colors"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

// ---- Modal Create ----
function CreateReminderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    jenis: "manual",
    referensi_id: "0",
    judul: "",
    tanggal_deadline: "",
    assigned_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    if (!form.tanggal_deadline) { setErr("Deadline wajib diisi"); return; }
    setLoading(true);
    setErr(null);
    const { error } = await reminderApi.create({
      jenis: form.jenis,
      referensi_id: parseInt(form.referensi_id) || 0,
      judul: form.judul || undefined,
      tanggal_deadline: new Date(form.tanggal_deadline).toISOString(),
      assigned_to: form.assigned_to ? parseInt(form.assigned_to) : undefined,
    });
    setLoading(false);
    if (error) { setErr(error); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">Tambah Reminder Manual</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Jenis</label>
            <select value={form.jenis} onChange={set("jenis")} className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50">
              {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Judul</label>
            <input value={form.judul} onChange={set("judul")} placeholder="Deskripsi reminder..." className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Deadline *</label>
            <input type="datetime-local" value={form.tanggal_deadline} onChange={set("tanggal_deadline")} className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Assign ke Akun ID (opsional)</label>
            <input type="number" value={form.assigned_to} onChange={set("assigned_to")} placeholder="ID Akun" className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50" />
          </div>
          {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-colors">Batal</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors">
              {loading ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function ReminderPage() {
  const [dashboard, setDashboard] = useState<ReminderDashboard | null>(null);
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<"dashboard" | "list">("dashboard");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (view === "dashboard") {
      const { data } = await reminderApi.dashboard();
      setDashboard(data);
    } else {
      const { data } = await reminderApi.list({ limit: 100 });
      if (data) { setAllReminders(data.data); setTotal(data.total); }
    }
    setLoading(false);
  }, [view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDone = async (id: number) => {
    await reminderApi.markDone(id);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus reminder ini?")) return;
    await reminderApi.delete(id);
    fetchData();
  };

  const handleSync = async () => {
    setSyncing(true);
    const { data } = await reminderApi.syncOverdue();
    setSyncing(false);
    if (data) alert(`Sync selesai: ${data.updated} reminder diupdate ke Overdue.`);
    fetchData();
  };

  const overdueCount = dashboard?.overdue.length ?? 0;
  const mendekatiCount = dashboard?.mendekati.length ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            🔔 Reminder
            {overdueCount > 0 && (
              <span className="ml-2 text-sm font-normal bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                {overdueCount} Overdue
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm">Deadline tracker otomatis — overdue tidak bisa di-snooze.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2.5 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {syncing ? "⟳ Sync..." : "⟳ Sync Overdue"}
          </button>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <span>＋</span> Tambah
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        {(["dashboard", "list"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              view === v
                ? "bg-red-600/20 text-red-400 border-red-500/30"
                : "text-slate-400 border-white/[0.06] hover:border-white/20 hover:text-white"
            }`}
          >
            {v === "dashboard" ? "📊 Dashboard" : "📋 Semua Reminder"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/[0.04] rounded-2xl animate-pulse" />)}
        </div>
      ) : view === "dashboard" && dashboard ? (
        <div className="space-y-8">
          {/* Overdue */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">
                Overdue ({dashboard.overdue.length})
              </h2>
            </div>
            {dashboard.overdue.length === 0 ? (
              <p className="text-slate-600 text-sm pl-5">Tidak ada reminder overdue 🎉</p>
            ) : (
              <div className="space-y-2">
                {dashboard.overdue.map((r) => (
                  <ReminderCard key={r.id} r={r} onDone={handleDone} onDelete={handleDelete} variant="overdue" />
                ))}
              </div>
            )}
          </div>

          {/* Mendekati Deadline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-widest">
                Mendekati Deadline ≤3 Hari ({dashboard.mendekati.length})
              </h2>
            </div>
            {dashboard.mendekati.length === 0 ? (
              <p className="text-slate-600 text-sm pl-5">Tidak ada.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.mendekati.map((r) => (
                  <ReminderCard key={r.id} r={r} onDone={handleDone} onDelete={handleDelete} variant="mendekati" />
                ))}
              </div>
            )}
          </div>

          {/* Akan Datang */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-slate-500" />
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                Akan Datang ({dashboard.akan_datang.length})
              </h2>
            </div>
            {dashboard.akan_datang.length === 0 ? (
              <p className="text-slate-600 text-sm pl-5">Tidak ada reminder mendatang.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.akan_datang.map((r) => (
                  <ReminderCard key={r.id} r={r} onDone={handleDone} onDelete={handleDelete} variant="akan_datang" />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500">{total} reminder</p>
          </div>
          {allReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="text-4xl mb-3">🔔</span>
              <p className="font-medium">Belum ada reminder</p>
            </div>
          ) : (
            allReminders.map((r) => (
              <ReminderCard key={r.id} r={r} onDone={handleDone} onDelete={handleDelete} variant="normal" />
            ))
          )}
        </div>
      )}

      {modal && (
        <CreateReminderModal onClose={() => setModal(false)} onSaved={() => { setModal(false); fetchData(); }} />
      )}
    </div>
  );
}
