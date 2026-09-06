"use client";

import React, { useEffect, useState, useCallback } from "react";
import { templateChatApi, type TemplateChat, type ResolvedTemplate } from "../../lib/hr-api";

const KATEGORI_OPTIONS = ["Medpart", "Sponsorship", "Undangan", "Reminder", "Umum"];

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([^}]+)\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

function PH_BADGE({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs rounded-md font-mono">
      {"{" + label + "}"}
    </span>
  );
}

// ---- Modal Kirim WA ----
function KirimWAModal({
  template,
  onClose,
}: {
  template: TemplateChat;
  onClose: () => void;
}) {
  const placeholders = extractPlaceholders(template.konten);
  const [ctx, setCtx] = useState<Record<string, string>>(
    Object.fromEntries(placeholders.map((p) => [p, ""]))
  );
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<ResolvedTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleResolve = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await templateChatApi.resolve(template.id, ctx, phone || undefined);
    setLoading(false);
    if (error) { setErr(error); return; }
    setResult(data);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white font-semibold">Kirim via WhatsApp</h2>
            <p className="text-slate-500 text-xs mt-0.5 truncate max-w-sm">{template.nama}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Template preview */}
          <div className="bg-[#0E0E10] rounded-xl p-4 text-slate-300 text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {template.konten}
          </div>

          {/* Placeholder fields */}
          {placeholders.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Isi Placeholder</p>
              {placeholders.map((ph) => (
                <div key={ph}>
                  <label className="block text-xs text-slate-400 mb-1">{ph}</label>
                  <input
                    value={ctx[ph] || ""}
                    onChange={(e) => setCtx({ ...ctx, [ph]: e.target.value })}
                    placeholder={`Nilai untuk {${ph}}`}
                    className="w-full bg-[#0E0E10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nomor WA Tujuan (opsional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="6281234567890"
              className="w-full bg-[#0E0E10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{err}</p>}

          <button
            onClick={handleResolve}
            disabled={loading}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? "Memproses..." : "Buat Pesan"}
          </button>

          {/* Result */}
          {result && (
            <div className="space-y-3 pt-2">
              {result.placeholders_missing.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-xs font-medium mb-1.5">Placeholder belum diisi:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.placeholders_missing.map((ph) => <PH_BADGE key={ph} label={ph} />)}
                  </div>
                </div>
              )}

              <div className="bg-[#0E0E10] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Pesan Terselesaikan</p>
                  <button
                    onClick={() => handleCopy(result.resolved)}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied ? "✓ Tersalin" : "Salin"}
                  </button>
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                  {result.resolved}
                </p>
              </div>

              {result.wa_url && (
                <a
                  href={result.wa_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <span>💬</span>
                  <span>Buka WhatsApp</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Modal Create / Edit ----
function TemplateModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: TemplateChat;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [kategori, setKategori] = useState(initial?.kategori ?? "");
  const [konten, setKonten] = useState(initial?.konten ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const placeholders = extractPlaceholders(konten);

  const handleSave = async () => {
    if (!nama.trim() || !konten.trim()) { setErr("Nama dan konten wajib diisi"); return; }
    setLoading(true);
    setErr(null);
    const payload = { nama: nama.trim(), kategori: kategori || undefined, konten: konten.trim() };
    const { error } = initial
      ? await templateChatApi.update(initial.id, payload)
      : await templateChatApi.create(payload);
    setLoading(false);
    if (error) { setErr(error); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">{initial ? "Edit Template" : "Buat Template Chat"}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nama Template *</label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Template Konfirmasi Medpart"
              className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Kategori</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
            >
              <option value="">— Pilih Kategori —</option>
              {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Konten * <span className="text-slate-600 font-normal normal-case">gunakan {"{nama_placeholder}"} untuk variabel</span>
            </label>
            <textarea
              value={konten}
              onChange={(e) => setKonten(e.target.value)}
              rows={6}
              placeholder={"Halo {nama},\n\nKami mengundang kamu untuk... {detail}\n\nDeadline: {deadline}"}
              className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 font-mono resize-none"
            />
            {placeholders.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {placeholders.map((ph) => <PH_BADGE key={ph} label={ph} />)}
              </div>
            )}
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
              {loading ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Buat Template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function TemplateChatPage() {
  const [templates, setTemplates] = useState<TemplateChat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [waModal, setWaModal] = useState<TemplateChat | null>(null);
  const [selected, setSelected] = useState<TemplateChat | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await templateChatApi.list({ kategori: kategoriFilter || undefined, limit: 100 });
    setLoading(false);
    if (data) { setTemplates(data.data); setTotal(data.total); }
  }, [kategoriFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus template "${nama}"?`)) return;
    await templateChatApi.delete(id);
    fetchAll();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">💬 Template Chat</h1>
          <p className="text-slate-400 text-sm">
            Kelola template pesan WhatsApp dengan placeholder dinamis &amp; wa.me generator.
          </p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal("create"); }}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <span>＋</span> Template Baru
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["", ...KATEGORI_OPTIONS].map((k) => (
          <button
            key={k || "all"}
            onClick={() => setKategoriFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              kategoriFilter === k
                ? "bg-red-600/20 text-red-400 border-red-500/30"
                : "text-slate-400 border-white/[0.06] hover:border-white/20 hover:text-white"
            }`}
          >
            {k || "Semua"}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{total} template</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.04] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <span className="text-4xl mb-3">💬</span>
          <p className="font-medium">Belum ada template</p>
          <p className="text-xs mt-1">Buat template pertama untuk mulai kirim WA.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const phs = extractPlaceholders(t.konten);
            return (
              <div
                key={t.id}
                className="bg-[#18181B] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{t.nama}</p>
                    {t.kategori && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/15 text-blue-400 text-xs rounded-md border border-blue-500/20">
                        {t.kategori}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setWaModal(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/15 hover:bg-green-600/30 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium transition-colors"
                    >
                      💬 Kirim WA
                    </button>
                    <button
                      onClick={() => { setSelected(t); setModal("edit"); }}
                      className="px-3 py-1.5 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.nama)}
                      className="px-3 py-1.5 text-red-400 hover:text-white hover:bg-red-600/20 border border-red-500/20 rounded-lg text-xs transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-xs line-clamp-2 font-mono leading-relaxed mb-3">
                  {t.konten}
                </p>
                {phs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {phs.map((ph) => <PH_BADGE key={ph} label={ph} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {(modal === "create" || modal === "edit") && (
        <TemplateModal
          initial={modal === "edit" ? selected ?? undefined : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAll(); }}
        />
      )}
      {waModal && (
        <KirimWAModal template={waModal} onClose={() => setWaModal(null)} />
      )}
    </div>
  );
}
