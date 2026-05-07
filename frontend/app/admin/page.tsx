"use client"; // Wajib ditambahkan agar bisa menggunakan state dan event handler

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  
  // State manajemen dengan typing TypeScript
  const [daftarAcara, setDaftarAcara] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mengambil data saat halaman pertama kali dimuat
  useEffect(() => {
    const fetchAcara = async () => {
      const accesstoken = localStorage.getItem('access_token');
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
            'Content-Type': 'application/json'
          }
        });

        // Jika token utama kedaluwarsa, coba perbarui menggunakan refresh token
        if (meResponse.status === 401) {
          localStorage.removeItem('access_token');
          
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshtoken}`,
              'Content-Type': 'application/json'
            }
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
            'Content-Type': 'application/json'
          }
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
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken && accessToken) {
      try {
        // Memanggil endpoint logout di FastAPI
        await fetch('/api/akun/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`, 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch (err: any) {
        console.error("Gagal melakukan logout di sisi server", err);
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
  const acaraAktif = daftarAcara.filter(a => a.status === 'Aktif').length;

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans selection:bg-red-600/30">
      
      {/* --- NAVBAR ADMIN --- */}
      <nav className="bg-[#18181b] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Pastikan file logo-uft.png benar-benar ada di folder /public */}
            <img src="/logo-uft.png" alt="Logo UFT" className="w-8 h-8" />
            <span className="font-bold text-white tracking-wide text-lg">UFT<span className="text-red-500 font-normal">Admin</span></span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
          >
            Keluar <span>🚪</span>
          </button>
        </div>
      </nav>

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
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">Dashboard Utama</h1>
            <p className="text-slate-500 text-sm md:text-base">Selamat datang kembali. Berikut adalah ringkasan acara pameran Anda.</p>
          </div>
          
          <Link href="/admin/acara/baru">
            <button className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-0.5 flex items-center gap-2">
              <span className="text-xl leading-none">+</span> Buat Acara Baru
            </button>
          </Link>
        </header>

        {/* --- STATISTIK SINGKAT --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Acara</div>
            <div className="text-4xl font-extrabold text-white">{daftarAcara.length}</div>
          </div>
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Karya Masuk</div>
            {/* Hardcoded sementara karena atribut total karya global belum ada di backend model */}
            <div className="text-4xl font-extrabold text-white">0</div> 
          </div>
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-4 -mt-4"></div>
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2 relative z-10">Acara Sedang Aktif</div>
            <div className="text-4xl font-extrabold text-red-500 relative z-10">{acaraAktif}</div>
          </div>
        </div>

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
                {daftarAcara.map((acara) => (
                  <tr key={acara.acaraID} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6">
                      <div className="font-bold text-white text-sm md:text-base mb-1 group-hover:text-red-400 transition-colors line-clamp-1">
                        {acara.nama} 
                      </div>
                      <div className="text-xs text-slate-500 md:hidden"></div>
                    </td>
                    <td className="p-6 text-sm text-slate-400 hidden md:table-cell whitespace-nowrap">
                        <span className="line-clamp-1">{acara.waktu.substring(11, 16)}</span>
                        <span className="line-clamp-1">{acara.waktu.substring(8, 10)}-{acara.waktu.substring(5, 7)}-{acara.waktu.substring(0, 4)}</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        acara.status === 'Aktif' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        acara.status === 'Mendatang' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        acara.status === 'Selesai' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
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
                ))}
                
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
    </main>
  );
}