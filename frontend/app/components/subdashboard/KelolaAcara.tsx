"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Konstanta Konfigurasi Notifikasi ─────────────────────────────────────────

const LS_NOTIF_ENABLED = 'notif_jadwal_enabled';
const LS_NOTIF_OFFSET  = 'notif_jadwal_offset_minutes';

const OFFSET_OPTIONS = [
  { label: '15 menit sebelum',  value: 15   },
  { label: '30 menit sebelum',  value: 30   },
  { label: '1 jam sebelum',     value: 60   },
  { label: '2 jam sebelum',     value: 120  },
  { label: '1 hari sebelum',    value: 1440 },
];

// ─── Tipe ─────────────────────────────────────────────────────────────────────

type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface ScheduledAcara {
  acaraID: number;
  nama: string;
  waktu: string;
  tempat?: string;
  status: string;
}

// ─── Helper: parse waktu acara ke objek Date ──────────────────────────────────

function parseAcaraWaktu(waktu: string): Date | null {
  if (!waktu) return null;
  // Format dari backend: "YYYY-MM-DDTHH:mm:ss" atau "YYYY-MM-DD HH:mm:ss"
  const normalized = waktu.replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Helper: format durasi ────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Sudah lewat';
  const totalSec = Math.floor(ms / 1000);
  const days     = Math.floor(totalSec / 86400);
  const hours    = Math.floor((totalSec % 86400) / 3600);
  const minutes  = Math.floor((totalSec % 3600) / 60);

  if (days > 0)   return `${days} hari ${hours} jam lagi`;
  if (hours > 0)  return `${hours} jam ${minutes} menit lagi`;
  return `${minutes} menit lagi`;
}

// ─── Helper: tampilkan notifikasi browser ─────────────────────────────────────

function showBrowserNotification(acara: ScheduledAcara, offsetMinutes: number) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const offsetLabel = OFFSET_OPTIONS.find(o => o.value === offsetMinutes)?.label ?? `${offsetMinutes} menit sebelum`;
  const waktuObj    = parseAcaraWaktu(acara.waktu);
  const jamStr      = waktuObj
    ? `${String(waktuObj.getHours()).padStart(2,'0')}:${String(waktuObj.getMinutes()).padStart(2,'0')}`
    : acara.waktu;

  const body = [
    `⏰ Dimulai ${offsetLabel.replace(' sebelum', '')} lagi!`,
    `🕐 Pukul: ${jamStr}`,
    acara.tempat ? `📍 Tempat: ${acara.tempat}` : '',
  ].filter(Boolean).join('\n');

  try {
    const notif = new Notification(`📸 ${acara.nama}`, {
      body,
      icon:  '/logo-uft.png',
      badge: '/logo-uft.png',
      tag:   `acara-${acara.acaraID}-${offsetMinutes}`, // mencegah duplikat
      requireInteraction: true,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.warn('Gagal menampilkan notifikasi:', err);
  }
}

// ─── Hook: useScheduleNotifications ──────────────────────────────────────────

function useScheduleNotifications(daftarAcara: ScheduledAcara[]) {
  const [permission,      setPermission]     = useState<NotifPermission>('default');
  const [notifEnabled,    setNotifEnabled]   = useState(false);
  const [offsetMinutes,   setOffsetMinutes]  = useState(60);
  const [scheduledCount,  setScheduledCount] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Inisialisasi: baca dari localStorage & permission browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cek dukungan API
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as NotifPermission);

    // Baca preferensi tersimpan
    const savedEnabled = localStorage.getItem(LS_NOTIF_ENABLED);
    const savedOffset  = localStorage.getItem(LS_NOTIF_OFFSET);

    if (savedEnabled !== null) setNotifEnabled(savedEnabled === 'true');
    if (savedOffset  !== null) {
      const parsed = parseInt(savedOffset, 10);
      if (!isNaN(parsed)) setOffsetMinutes(parsed);
    }
  }, []);

  // Fungsi: minta izin notifikasi
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotifPermission);
      if (result === 'granted') {
        setNotifEnabled(true);
        localStorage.setItem(LS_NOTIF_ENABLED, 'true');
      }
    } catch (err) {
      console.error('Gagal meminta izin notifikasi:', err);
    }
  }, []);

  // Fungsi: toggle notifikasi on/off
  const toggleNotif = useCallback((val: boolean) => {
    setNotifEnabled(val);
    localStorage.setItem(LS_NOTIF_ENABLED, String(val));
  }, []);

  // Fungsi: ganti offset
  const changeOffset = useCallback((minutes: number) => {
    setOffsetMinutes(minutes);
    localStorage.setItem(LS_NOTIF_OFFSET, String(minutes));
  }, []);

  // Efek utama: jadwalkan timer setiap kali data atau konfigurasi berubah
  useEffect(() => {
    // Bersihkan semua timer lama
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!notifEnabled || permission !== 'granted' || daftarAcara.length === 0) {
      setScheduledCount(0);
      return;
    }

    const now      = Date.now();
    let   count    = 0;
    const offsetMs = offsetMinutes * 60 * 1000;

    for (const acara of daftarAcara) {
      // Lewati acara yang sudah selesai
      if (acara.status === 'Selesai') continue;

      const eventTime = parseAcaraWaktu(acara.waktu);
      if (!eventTime) continue;

      const reminderTime = eventTime.getTime() - offsetMs;
      const delay        = reminderTime - now;

      // Hanya jadwalkan jika waktu pengingat masih di masa depan
      if (delay > 0) {
        const timer = setTimeout(() => {
          showBrowserNotification(acara, offsetMinutes);
        }, delay);
        timersRef.current.push(timer);
        count++;
      }
    }

    setScheduledCount(count);

    // Cleanup saat unmount atau dependensi berubah
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [notifEnabled, permission, daftarAcara, offsetMinutes]);

  return {
    permission,
    notifEnabled,
    offsetMinutes,
    scheduledCount,
    requestPermission,
    toggleNotif,
    changeOffset,
  };
}

// ─── Komponen: NotificationPanel ─────────────────────────────────────────────

function NotificationPanel({
  daftarAcara,
}: {
  daftarAcara: ScheduledAcara[];
}) {
  const {
    permission,
    notifEnabled,
    offsetMinutes,
    scheduledCount,
    requestPermission,
    toggleNotif,
    changeOffset,
  } = useScheduleNotifications(daftarAcara);

  // Countdown live untuk acara berikutnya
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30_000); // update tiap 30 detik
    return () => clearInterval(interval);
  }, []);

  // Cari acara berikutnya yang belum lewat dan belum selesai
  const now = Date.now();
  const offsetMs = offsetMinutes * 60 * 1000;
  const acaraMendatang = daftarAcara
    .filter(a => a.status !== 'Selesai' && parseAcaraWaktu(a.waktu) !== null)
    .map(a => ({ ...a, eventMs: parseAcaraWaktu(a.waktu)!.getTime() }))
    .filter(a => a.eventMs > now)
    .sort((a, b) => a.eventMs - b.eventMs);

  const acaraBerikutnya = acaraMendatang[0] ?? null;
  const nextReminderMs  = acaraBerikutnya ? acaraBerikutnya.eventMs - offsetMs - now : null;

  // Status warna & teks izin
  const permissionInfo: Record<NotifPermission, { color: string; dot: string; label: string }> = {
    granted:     { color: 'text-green-400',  dot: 'bg-green-500',  label: 'Izin Diberikan'  },
    denied:      { color: 'text-red-400',    dot: 'bg-red-500',    label: 'Izin Ditolak'    },
    default:     { color: 'text-yellow-400', dot: 'bg-yellow-500', label: 'Belum Diminta'   },
    unsupported: { color: 'text-slate-500',  dot: 'bg-slate-600',  label: 'Tidak Didukung'  },
  };
  const pInfo = permissionInfo[permission];

  return (
    <div className="mb-8 bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      {/* Header panel */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.015] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Ikon lonceng animasi */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
            notifEnabled && permission === 'granted'
              ? 'bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-white/5'
          }`}>
            <span className={notifEnabled && permission === 'granted' ? 'animate-bounce' : ''}>🔔</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Pengingat Jadwal</h3>
            <p className="text-xs text-slate-500">Notifikasi browser otomatis sebelum acara dimulai</p>
          </div>
        </div>

        {/* Status izin & toggle */}
        <div className="flex items-center gap-4">
          {/* Dot status izin */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${pInfo.dot} ${permission === 'granted' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-semibold ${pInfo.color}`}>{pInfo.label}</span>
          </div>

          {/* Toggle switch */}
          {permission === 'granted' && (
            <button
              id="btn-toggle-notif"
              onClick={() => toggleNotif(!notifEnabled)}
              title={notifEnabled ? 'Matikan pengingat' : 'Aktifkan pengingat'}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#18181b] ${
                notifEnabled
                  ? 'bg-amber-500 focus:ring-amber-500'
                  : 'bg-white/10 focus:ring-white/30'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                notifEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          )}
        </div>
      </div>

      {/* Body panel */}
      <div className="p-6">
        {/* Jika browser tidak mendukung */}
        {permission === 'unsupported' && (
          <div className="flex items-center gap-3 text-slate-500 text-sm bg-white/[0.02] rounded-xl p-4">
            <span className="text-xl">⚠️</span>
            <span>Browser kamu tidak mendukung Web Notifications API.</span>
          </div>
        )}

        {/* Jika izin ditolak */}
        {permission === 'denied' && (
          <div className="flex items-start gap-3 text-sm bg-red-500/5 border border-red-500/15 rounded-xl p-4">
            <span className="text-xl flex-shrink-0">🚫</span>
            <div>
              <p className="text-red-400 font-semibold mb-0.5">Izin notifikasi ditolak</p>
              <p className="text-slate-500 text-xs">Aktifkan kembali melalui ikon 🔒 di address bar browser, lalu pilih <strong>Allow Notifications</strong>.</p>
            </div>
          </div>
        )}

        {/* Jika belum diminta izin */}
        {permission === 'default' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 text-sm">
              <span className="text-xl flex-shrink-0">💡</span>
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Aktifkan pengingat otomatis</p>
                <p className="text-slate-500 text-xs">Izinkan notifikasi browser agar sistem dapat mengingatkanmu sebelum acara dimulai.</p>
              </div>
            </div>
            <button
              id="btn-request-notif-permission"
              onClick={requestPermission}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:-translate-y-0.5"
            >
              <span>🔔</span> Izinkan Notifikasi
            </button>
          </div>
        )}

        {/* Jika sudah punya izin */}
        {permission === 'granted' && (
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Konfigurasi offset */}
            <div className="flex-1">
              <label htmlFor="select-notif-offset" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Ingatkan saya
              </label>
              <div className="relative">
                <select
                  id="select-notif-offset"
                  value={offsetMinutes}
                  onChange={e => changeOffset(Number(e.target.value))}
                  disabled={!notifEnabled}
                  className={`w-full appearance-none bg-[#0f0f11] border rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all pr-9 ${
                    notifEnabled
                      ? 'border-white/10 text-white focus:border-amber-500/50 cursor-pointer hover:border-white/20'
                      : 'border-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {OFFSET_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {/* Chevron ikon */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▾</span>
              </div>
            </div>

            {/* Info acara berikutnya */}
            <div className="flex-1 sm:border-l border-white/5 sm:pl-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Acara Berikutnya
              </p>
              {acaraBerikutnya ? (
                <div>
                  <p className="text-white text-sm font-semibold line-clamp-1 mb-0.5">{acaraBerikutnya.nama}</p>
                  <p className="text-slate-400 text-xs mb-2">
                    {(() => {
                      const d = parseAcaraWaktu(acaraBerikutnya.waktu);
                      if (!d) return acaraBerikutnya.waktu;
                      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                    })()}
                  </p>
                  {notifEnabled && nextReminderMs !== null ? (
                    nextReminderMs > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                        Pengingat {formatCountdown(nextReminderMs)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[11px] font-semibold">
                        ⚡ Waktu pengingat sudah lewat
                      </span>
                    )
                  ) : (
                    <span className="text-slate-600 text-xs">— Pengingat nonaktif</span>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 text-sm italic">Tidak ada acara mendatang</p>
              )}
            </div>

            {/* Badge: jumlah yang terjadwal */}
            {notifEnabled && scheduledCount > 0 && (
              <div className="sm:border-l border-white/5 sm:pl-6 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Terjadwal
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-extrabold text-amber-400 leading-none">{scheduledCount}</span>
                  <span className="text-xs text-slate-500 mb-0.5 font-medium">pengingat</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function KelolaAcara() {
  const router = useRouter();

  // State manajemen dengan typing TypeScript
  const [daftarAcara, setDaftarAcara] = useState<ScheduledAcara[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mengambil data saat halaman pertama kali dimuat
  useEffect(() => {
    const fetchAcara = async () => {
      const accesstoken  = localStorage.getItem('access_token');
      const refreshtoken = localStorage.getItem('refresh_token');

      // Proteksi awal jika token sama sekali tidak ada
      if (!accesstoken || !refreshtoken) {
        router.push('/admin/login');
        return;
      }

      // Tahap 1: Validasi Sesi Pengguna
      try {
        const meResponse = await fetch('/api/akun/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accesstoken}`,
            'Content-Type': 'application/json',
          },
        });

        // Jika token utama kedaluwarsa, coba perbarui menggunakan refresh token
        if (meResponse.status === 401) {
          localStorage.removeItem('access_token');

          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshtoken}`,
              'Content-Type': 'application/json',
            },
          });

          if (refreshResponse.ok) {
            const accessTokenData = await refreshResponse.json();
            localStorage.setItem('access_token', accessTokenData.access_token);
            // Panggil ulang fungsinya agar mengambil data menggunakan token yang baru saja diperbarui
            fetchAcara();
            return; // Hentikan eksekusi yang ini agar tidak tumpang tindih
          } else {
            // Jika refresh token juga kedaluwarsa/tidak valid
            router.push('/admin/login');
            return;
          }
        }
      } catch (err: any) {
        setError(err.message);
      }

      // Tahap 2: Fetch Data Acara (Menggunakan token terbaru)
      const currentToken = localStorage.getItem('access_token');
      try {
        const listResponse = await fetch('/api/acara/list-all', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentToken}`, // Gunakan token dari memori lokal terbaru
            'Content-Type': 'application/json',
          },
        });

        if (listResponse.status === 401 || listResponse.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          router.push('/admin/login');
          return;
        }

        if (!listResponse.ok) {
          throw new Error('Gagal mengambil data acara');
        }

        const data = await listResponse.json();
        setDaftarAcara(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAcara();
  }, [router]);

  // Fungsi untuk menangani proses Logout
  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const accessToken  = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken && accessToken) {
      try {
        // Memanggil endpoint logout di FastAPI
        await fetch('/api/akun/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (err: any) {
        console.error('Gagal melakukan logout di sisi server', err);
      }
    }

    // Selalu hapus kedua token di sisi client terlepas dari respon server
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/admin/login');
  };

  // Tampilan saat data sedang dimuat
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0f0f11] flex items-center justify-center">
        <div className="text-red-500 text-xl font-bold animate-pulse">Memuat Data Sistem...</div>
      </main>
    );
  }

  // Menghitung jumlah acara aktif untuk widget statistik
  const acaraAktif    = daftarAcara.filter(a => a.status === 'Aktif').length;
  const acaraMendatang = daftarAcara.filter(a => a.status === 'Mendatang').length;

  return (
    <div className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans selection:bg-red-600/30">
      <div className="max-w-7xl mx-auto p-6 md:p-10">

        {/* Menampilkan pesan error jika ada */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 font-medium">
            Error: {error}
          </div>
        )}

        {/* --- HEADER DASHBOARD --- */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">Kelola Acara</h1>
            <p className="text-slate-500 text-sm md:text-base">Selamat datang kembali. Berikut adalah ringkasan acara Anda.</p>
          </div>

          <Link href="/admin/acara/baru">
            <button className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-0.5 flex items-center gap-2">
              <span className="text-xl leading-none">+</span> Buat Acara Baru
            </button>
          </Link>
        </header>

        {/* --- STATISTIK SINGKAT --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Acara</div>
            <div className="text-4xl font-extrabold text-white">{daftarAcara.length}</div>
          </div>
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Acara Mendatang</div>
            <div className="text-4xl font-extrabold text-blue-400">{acaraMendatang}</div>
          </div>
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-4 -mt-4" />
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2 relative z-10">Acara Sedang Aktif</div>
            <div className="text-4xl font-extrabold text-red-500 relative z-10">{acaraAktif}</div>
          </div>
        </div>

        {/* ─── PANEL PENGATURAN NOTIFIKASI ─────────────────────────────── */}
        <NotificationPanel daftarAcara={daftarAcara} />

        {/* --- TABEL DAFTAR ACARA --- */}
        <div className="bg-[#18181b] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Daftar Acara</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold">Nama Acara</th>
                  <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold hidden md:table-cell">Jadwal</th>
                  <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold text-center">Status</th>
                  <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold text-center hidden sm:table-cell">Statistik</th>
                  <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {daftarAcara.map((acara) => {
                  // Hitung sisa waktu menuju acara
                  const eventTime = parseAcaraWaktu(acara.waktu);
                  const msLeft    = eventTime ? eventTime.getTime() - Date.now() : null;
                  const isUpcoming = msLeft !== null && msLeft > 0 && acara.status !== 'Selesai';

                  return (
                    <tr key={acara.acaraID} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6">
                        <div className="font-bold text-white text-sm md:text-base mb-1 group-hover:text-red-400 transition-colors line-clamp-1">
                          {acara.nama}
                        </div>
                        {/* Countdown kecil di mobile */}
                        {isUpcoming && msLeft !== null && (
                          <div className="text-[10px] text-amber-500/80 font-medium md:hidden flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse inline-block" />
                            {formatCountdown(msLeft)}
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-sm text-slate-400 hidden md:table-cell whitespace-nowrap">
                        <span className="line-clamp-1">{acara.waktu.substring(11, 16)}</span>
                        <span className="line-clamp-1">{acara.waktu.substring(8, 10)}-{acara.waktu.substring(5, 7)}-{acara.waktu.substring(0, 4)}</span>
                        {/* Countdown untuk desktop */}
                        {isUpcoming && msLeft !== null && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse inline-block" />
                            <span className="text-[10px] text-amber-500/80 font-medium">{formatCountdown(msLeft)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          acara.status === 'Aktif'     ? 'bg-green-500/10 text-green-400 border-green-500/20'   :
                          acara.status === 'Mendatang' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'     :
                          acara.status === 'Selesai'   ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'  :
                          'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}>
                          {acara.status}
                        </span>
                      </td>
                      <td className="p-6 text-center hidden sm:table-cell">
                        <div className="text-xs text-slate-400">
                          <span className="text-white font-semibold">-</span> Karya
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="text-white font-semibold">-</span> Peserta
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <Link href={`/admin/acara/${acara.acaraID}`}>
                          <button className="px-4 py-2 bg-white/5 hover:bg-red-600 hover:text-white text-slate-300 rounded-lg text-sm font-semibold transition-all border border-white/10 hover:border-red-500">
                            Kelola
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {/* Penyesuaian colSpan menggunakan kurung kurawal */}
                {daftarAcara.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      Belum ada acara yang terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01] text-xs text-slate-500 text-center md:text-left">
            Menampilkan {daftarAcara.length} acara dari database.
          </div>
        </div>

      </div>
    </div>
  );
}