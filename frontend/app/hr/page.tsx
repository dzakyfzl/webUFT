"use client";

import React, { useEffect, useState } from "react";
import {
  medpartMasukApi,
  medpartSebarApi,
  jadwalPosterApi,
  sponsorshipApi,
  reminderApi,
  type ReminderDashboard,
} from "../lib/hr-api";
import { getHRUser, type HRUser } from "../lib/hr-auth";
import Link from "next/link";

interface Stats {
  medpartMasuk: number;
  medpartSebar: number;
  jadwalOverdue: number;
  sponsorAktif: number;
  reminderOverdue: number;
}

export default function HRDashboard() {
  const [user, setUser] = useState<HRUser | null>(null);
  const [stats, setStats] = useState<Stats>({
    medpartMasuk: 0,
    medpartSebar: 0,
    jadwalOverdue: 0,
    sponsorAktif: 0,
    reminderOverdue: 0,
  });
  const [reminderData, setReminderData] = useState<ReminderDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getHRUser();
    setUser(u);

    async function fetchStats() {
      try {
        const [mm, ms, jp, sp, rd] = await Promise.allSettled([
          medpartMasukApi.list({ limit: 1 }),
          medpartSebarApi.list({ limit: 1 }),
          jadwalPosterApi.list({ overdue_only: true, limit: 1 }),
          sponsorshipApi.list({ limit: 1 }),
          reminderApi.dashboard(),
        ]);

        const rdData = rd.status === "fulfilled" && rd.value.data ? rd.value.data : null;
        setReminderData(rdData);

        setStats({
          medpartMasuk: mm.status === "fulfilled" && mm.value.data ? mm.value.data.total : 0,
          medpartSebar: ms.status === "fulfilled" && ms.value.data ? ms.value.data.total : 0,
          jadwalOverdue: jp.status === "fulfilled" && jp.value.data ? jp.value.data.total : 0,
          sponsorAktif: sp.status === "fulfilled" && sp.value.data ? sp.value.data.total : 0,
          reminderOverdue: rdData ? rdData.overdue.length : 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Medpart Masuk",
      value: stats.medpartMasuk,
      icon: "📥",
      color: "from-blue-600/20 to-blue-900/10",
      border: "border-blue-500/20",
      href: "/hr/medpart-masuk",
    },
    {
      label: "Medpart Sebar",
      value: stats.medpartSebar,
      icon: "📤",
      color: "from-emerald-600/20 to-emerald-900/10",
      border: "border-emerald-500/20",
      href: "/hr/medpart-sebar",
    },
    {
      label: "Jadwal Overdue",
      value: stats.jadwalOverdue,
      icon: "⚠️",
      color: stats.jadwalOverdue > 0 ? "from-red-600/25 to-red-900/10" : "from-slate-700/20 to-slate-900/10",
      border: stats.jadwalOverdue > 0 ? "border-red-500/30" : "border-white/10",
      href: "/hr/jadwal-poster?overdue=1",
    },
    {
      label: "Sponsor Aktif",
      value: stats.sponsorAktif,
      icon: "🤝",
      color: "from-amber-600/20 to-amber-900/10",
      border: "border-amber-500/20",
      href: "/hr/sponsorship",
    },
    {
      label: "Reminder Overdue",
      value: stats.reminderOverdue,
      icon: "🔔",
      color: stats.reminderOverdue > 0 ? "from-red-600/25 to-red-900/10" : "from-slate-700/20 to-slate-900/10",
      border: stats.reminderOverdue > 0 ? "border-red-500/30" : "border-white/10",
      href: "/hr/reminder",
    },
  ];

  const quickActions = [
    { label: "Tambah Medpart Masuk", href: "/hr/medpart-masuk?modal=create", icon: "➕" },
    { label: "Lihat Jadwal Overdue", href: "/hr/jadwal-poster?overdue=1", icon: "🔴" },
    { label: "Template Chat WA", href: "/hr/template-chat", icon: "💬" },
    { label: "Reminder Dashboard", href: "/hr/reminder", icon: "🔔" },
    { label: "Aspirasi Bulan Ini", href: "/hr/aspirasi", icon: "💡" },
    { label: "Offer Masuk", href: "/hr/offer-masuk", icon: "📨" },
  ];

  const hasAlert = stats.jadwalOverdue > 0 || stats.reminderOverdue > 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Selamat Datang{user ? `, ${user.nama}` : ""}! 👋
        </h1>
        <p className="text-slate-400 text-sm">Dashboard UFT HR — ringkasan status semua modul.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-pointer`}
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <div className="text-2xl font-bold text-white mb-0.5">
              {loading ? (
                <div className="h-7 w-12 bg-white/10 rounded-lg animate-pulse" />
              ) : (
                card.value
              )}
            </div>
            <div className="text-xs text-slate-400 font-medium">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Alert banner */}
      {!loading && hasAlert && (
        <div className="mb-6 space-y-3">
          {stats.jadwalOverdue > 0 && (
            <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center gap-4">
              <span className="text-2xl">🚨</span>
              <div className="flex-1 min-w-0">
                <p className="text-red-400 font-semibold text-sm">
                  {stats.jadwalOverdue} jadwal poster telah melewati deadline!
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Segera tindak lanjuti sebelum semakin terlambat.</p>
              </div>
              <Link
                href="/hr/jadwal-poster?overdue=1"
                className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Lihat
              </Link>
            </div>
          )}
          {stats.reminderOverdue > 0 && (
            <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center gap-4">
              <span className="text-2xl">🔔</span>
              <div className="flex-1 min-w-0">
                <p className="text-red-400 font-semibold text-sm">
                  {stats.reminderOverdue} reminder sudah melewati deadline!
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Buka halaman Reminder untuk menandai sebagai selesai.</p>
              </div>
              <Link
                href="/hr/reminder"
                className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Lihat
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Overdue Reminder Section */}
      {!loading && reminderData && reminderData.overdue.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Reminder Overdue
          </h2>
          <div className="space-y-2">
            {reminderData.overdue.slice(0, 5).map((r) => {
              const days = Math.abs(
                Math.ceil((new Date(r.tanggal_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              );
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-[#18181B] border border-red-500/20 rounded-xl p-3.5"
                >
                  <span className="text-lg flex-shrink-0">
                    {r.jenis === "undangan" ? "✉️" : r.jenis === "poster" ? "📅" : r.jenis === "aspirasi" ? "💡" : "📝"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {r.judul ?? `${r.jenis} #${r.referensi_id}`}
                    </p>
                    <p className="text-red-400 text-xs">{days} hari terlambat</p>
                  </div>
                  <Link
                    href="/hr/reminder"
                    className="flex-shrink-0 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
                  >
                    Detail
                  </Link>
                </div>
              );
            })}
            {reminderData.overdue.length > 5 && (
              <Link
                href="/hr/reminder"
                className="block text-center text-xs text-red-400 hover:text-red-300 py-2 border border-red-500/20 rounded-xl hover:bg-red-600/10 transition-colors"
              >
                Lihat {reminderData.overdue.length - 5} reminder overdue lainnya →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-[#18181B] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all group text-center"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
              <span className="text-xs text-slate-400 group-hover:text-white transition-colors font-medium leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

