"use client";

import React, { useEffect, useState, useCallback } from "react";
import { aspirasiApi, type AspirasiSettings, type AspirasiRiwayat } from "../../lib/hr-api";

const BULAN_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_COLORS: Record<string, string> = {
  "Belum Dikirim": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Sudah Dikirim": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Overdue: "bg-red-500/15 text-red-400 border-red-500/20",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20";
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs rounded-md border font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ---- Settings Panel ----
function SettingsPanel({ settings, onSaved }: { settings: AspirasiSettings | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    link_form: settings?.link_form ?? "",
    link_grup_wa: settings?.link_grup_wa ?? "",
    template_pesan: settings?.template_pesan ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        link_form: settings.link_form ?? "",
        link_grup_wa: settings.link_grup_wa ?? "",
        template_pesan: settings.template_pesan ?? "",
      });
    }
  }, [settings]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    setLoading(true);
    setErr(null);
    const { error } = await aspirasiApi.updateSettings({
      link_form: form.link_form || undefined,
      link_grup_wa: form.link_grup_wa || undefined,
      template_pesan: form.template_pesan || undefined,
    });
    setLoading(false);
    if (error) { setErr(error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  return (
    <div className="bg-[#18181B] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm">⚙️ Pengaturan Aspirasi</h3>
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Link Google Form Aspirasi</label>
        <input
          value={form.link_form}
          onChange={set("link_form")}
          placeholder="https://forms.gle/..."
          className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Link Grup WhatsApp</label>
        <input
          value={form.link_grup_wa}
          onChange={set("link_grup_wa")}
          placeholder="https://chat.whatsapp.com/..."
          className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">
          Template Pesan <span className="text-slate-600 font-normal">— gunakan {"{bulan}"}, {"{tahun}"}, {"{link_form}"}</span>
        </label>
        <textarea
          value={form.template_pesan}
          onChange={set("template_pesan")}
          rows={4}
          placeholder={"Hai teman-teman! 👋\nFormulir aspirasi bulan {bulan} {tahun} sudah dibuka:\n{link_form}"}
          className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 font-mono resize-none"
        />
      </div>
      {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{err}</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors"
      >
        {loading ? "Menyimpan..." : saved ? "✓ Tersimpan" : "Simpan Pengaturan"}
      </button>
    </div>
  );
}

// ---- Riwayat Bulanan Row ----
function RiwayatRow({
  r,
  settings,
  onRefresh,
}: {
  r: AspirasiRiwayat;
  settings: AspirasiSettings | null;
  onRefresh: () => void;
}) {
  const [markModal, setMarkModal] = useState(false);
  const [linkRekap, setLinkRekap] = useState(r.link_rekap ?? "");
  const [loading, setLoading] = useState(false);

  const handleMarkSent = async () => {
    setLoading(true);
    await aspirasiApi.markSent(r.bulan, r.tahun, linkRekap || undefined);
    setLoading(false);
    setMarkModal(false);
    onRefresh();
  };

  const isBulanIni = (() => {
    const now = new Date();
    return r.bulan === now.getMonth() + 1 && r.tahun === now.getFullYear();
  })();

  return (
    <>
      <div
        className={`bg-[#18181B] border rounded-2xl p-4 flex items-center gap-4 ${
          isBulanIni ? "border-red-500/20" : "border-white/[0.06]"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white font-medium text-sm">
              {BULAN_NAMES[r.bulan]} {r.tahun}
            </p>
            {isBulanIni && (
              <span className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-md">
                Bulan ini
              </span>
            )}
            <StatusBadge status={r.status} />
          </div>
          {r.dikirim_pada && (
            <p className="text-slate-500 text-xs">
              Dikirim: {new Date(r.dikirim_pada).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          {r.link_rekap && (
            <a
              href={r.link_rekap}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-xs hover:underline"
            >
              📎 Link Rekap
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Buka Grup */}
          {settings?.link_grup_wa && (
            <a
              href={settings.link_grup_wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/15 hover:bg-green-600/30 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium transition-colors"
            >
              💬 Grup WA
            </a>
          )}
          {/* Copy Pesan */}
          {settings?.template_pesan && (
            <button
              onClick={() => {
                const pesan = (settings.template_pesan ?? "")
                  .replace("{bulan}", BULAN_NAMES[r.bulan])
                  .replace("{tahun}", String(r.tahun))
                  .replace("{link_form}", settings.link_form ?? "");
                navigator.clipboard.writeText(pesan);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium transition-colors"
            >
              📋 Salin Pesan
            </button>
          )}
          {/* Tandai Sudah Dikirim */}
          {r.status !== "Sudah Dikirim" && (
            <button
              onClick={() => setMarkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors"
            >
              ✓ Sudah Dikirim
            </button>
          )}
        </div>
      </div>

      {/* Mark Sent Modal */}
      {markModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <h3 className="text-white font-semibold mb-4">
              Tandai Sudah Dikirim — {BULAN_NAMES[r.bulan]} {r.tahun}
            </h3>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">Link Rekap (opsional)</label>
              <input
                value={linkRekap}
                onChange={(e) => setLinkRekap(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMarkModal(false)}
                className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleMarkSent}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors"
              >
                {loading ? "Menyimpan..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---- Main Page ----
export default function AspirasiPage() {
  const [settings, setSettings] = useState<AspirasiSettings | null>(null);
  const [riwayat, setRiwayat] = useState<AspirasiRiwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"riwayat" | "settings">("riwayat");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      aspirasiApi.getSettings(),
      aspirasiApi.getRiwayat(),
    ]);
    if (s.data) setSettings(s.data);
    if (r.data) setRiwayat(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const overdueCount = riwayat.filter((r) => r.status === "Overdue").length;
  const belumDikirimCount = riwayat.filter((r) => r.status === "Belum Dikirim").length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">💡 Aspirasi Anggota</h1>
          <p className="text-slate-400 text-sm">
            Kelola pengiriman formulir aspirasi bulanan dan riwayat pengiriman ke grup WA.
          </p>
        </div>
        {overdueCount > 0 && (
          <span className="flex-shrink-0 px-3 py-2 bg-red-600/15 border border-red-500/30 text-red-400 text-sm font-medium rounded-xl">
            🔴 {overdueCount} Overdue
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Bulan", value: riwayat.length, color: "text-white" },
          { label: "Belum Dikirim", value: belumDikirimCount, color: belumDikirimCount > 0 ? "text-amber-400" : "text-white" },
          { label: "Sudah Dikirim", value: riwayat.filter((r) => r.status === "Sudah Dikirim").length, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#18181B] border border-white/[0.06] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${color} mb-0.5`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["riwayat", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              tab === t
                ? "bg-red-600/20 text-red-400 border-red-500/30"
                : "text-slate-400 border-white/[0.06] hover:border-white/20 hover:text-white"
            }`}
          >
            {t === "riwayat" ? "📅 Riwayat Bulanan" : "⚙️ Pengaturan"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/[0.04] rounded-2xl animate-pulse" />)}
        </div>
      ) : tab === "settings" ? (
        <SettingsPanel settings={settings} onSaved={fetchAll} />
      ) : (
        <div className="space-y-3">
          {riwayat.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="text-4xl mb-3">💡</span>
              <p className="font-medium">Belum ada riwayat aspirasi</p>
              <p className="text-xs mt-1">Record akan muncul otomatis setiap bulan via APScheduler.</p>
            </div>
          ) : (
            riwayat.map((r) => (
              <RiwayatRow key={r.id} r={r} settings={settings} onRefresh={fetchAll} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
