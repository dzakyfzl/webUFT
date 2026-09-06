"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { auditLogApi, type AuditLogEntry } from "../../lib/hr-api";

const MODUL_LABELS: Record<string, string> = {
  medpart_masuk: "Medpart Masuk",
  medpart_sebar: "Medpart Sebar",
  jadwal_poster: "Jadwal Poster",
  sponsor: "Sponsorship",
  offer_sponsorship: "Offer Sponsorship",
  offer_kerjasama: "Offer Kerjasama",
  undangan: "Undangan",
  proker: "Proker",
  template_chat: "Template Chat",
  aspirasi: "Aspirasi",
  ai_settings: "AI Settings",
  user_management: "Manajemen Akun",
};

const AKSI_COLORS: Record<string, string> = {
  created: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  updated: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  status_changed: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  deleted: "bg-red-500/15 text-red-400 border-red-500/20",
  note_added: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  assignment_changed: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  approval_changed: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const MODULE_ROUTES: Record<string, string> = {
  medpart_masuk: "/hr/medpart-masuk",
  medpart_sebar: "/hr/medpart-sebar",
  sponsor: "/hr/sponsorship",
  undangan: "/hr/undangan",
  proker: "/hr/proker",
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AuditBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs rounded-md border font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function AuditRow({ log }: { log: AuditLogEntry }) {
  const aksiColor = AKSI_COLORS[log.aksi] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20";
  const drilldownHref = MODULE_ROUTES[log.modul]
    ? `${MODULE_ROUTES[log.modul]}/${log.record_id}`
    : null;

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-300 font-medium">
          {MODUL_LABELS[log.modul] ?? log.modul}
        </span>
      </td>
      <td className="px-4 py-3">
        {drilldownHref ? (
          <Link
            href={drilldownHref}
            className="text-xs text-blue-400 hover:underline"
          >
            #{log.record_id}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">#{log.record_id}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <AuditBadge label={log.aksi.replace(/_/g, " ")} colorClass={aksiColor} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white text-[10px] flex-shrink-0">
            {log.user_nama.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-300">{log.user_nama}</span>
          {log.via_ai && (
            <span className="text-[10px] bg-violet-500/15 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        {log.field_key ? (
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
              {log.field_key}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {log.nilai_lama !== null && (
                <span className="text-xs text-slate-500 line-through truncate max-w-[80px]">
                  {log.nilai_lama}
                </span>
              )}
              {log.nilai_lama !== null && log.nilai_baru !== null && (
                <span className="text-slate-600">→</span>
              )}
              {log.nilai_baru !== null && (
                <span className="text-xs text-slate-300 truncate max-w-[80px]">
                  {log.nilai_baru}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moduls, setModuls] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    modul: "",
    date_from: "",
    date_to: "",
  });
  const [applied, setApplied] = useState(filters);

  // Fetch distinct moduls once
  useEffect(() => {
    auditLogApi.getModuls().then(({ data }) => {
      if (data) setModuls(data.moduls);
    });
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await auditLogApi.list({
      modul: applied.modul || undefined,
      date_from: applied.date_from ? new Date(applied.date_from).toISOString() : undefined,
      date_to: applied.date_to ? new Date(applied.date_to + "T23:59:59").toISOString() : undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    });
    setLoading(false);
    if (data) {
      setLogs(data.data);
      setTotal(data.total);
    }
  }, [applied, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleApply = () => {
    setPage(0);
    setApplied(filters);
  };

  const handleReset = () => {
    const empty = { modul: "", date_from: "", date_to: "" };
    setFilters(empty);
    setApplied(empty);
    setPage(0);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">📜 Audit Log</h1>
        <p className="text-slate-400 text-sm">
          Riwayat seluruh aktivitas HR — siapa mengubah apa, kapan, dan dari mana.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#18181B] border border-white/[0.06] rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1.5">Modul</label>
          <select
            value={filters.modul}
            onChange={(e) => setFilters({ ...filters, modul: e.target.value })}
            className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
          >
            <option value="">Semua Modul</option>
            {moduls.map((m) => (
              <option key={m} value={m}>
                {MODUL_LABELS[m] ?? m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1.5">Dari Tanggal</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1.5">Sampai Tanggal</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="w-full bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
          >
            Terapkan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">
          {total} log ditemukan
          {applied.modul && ` · modul: ${MODUL_LABELS[applied.modul] ?? applied.modul}`}
          {applied.date_from && ` · dari ${applied.date_from}`}
          {applied.date_to && ` · s.d. ${applied.date_to}`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg disabled:opacity-40 transition-colors"
            >
              ← Sebelumnya
            </button>
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg disabled:opacity-40 transition-colors"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#18181B] border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 border-b border-white/[0.04] animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">📜</span>
            <p className="font-medium">Belum ada log aktivitas</p>
            <p className="text-xs mt-1">Log akan muncul setelah ada aktivitas di modul HR.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {["Waktu", "Modul", "Record", "Aksi", "User", "Detail Perubahan"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <AuditRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl disabled:opacity-40 transition-colors"
          >
            ← Sebelumnya
          </button>
          <span className="text-sm text-slate-500">
            Halaman {page + 1} dari {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl disabled:opacity-40 transition-colors"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}
