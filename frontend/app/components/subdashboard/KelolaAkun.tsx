"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- Tipe Data TypeScript ---
interface Bidang {
  bidangID: number;
  nama: string;
}

interface Akun {
  akunID: number;
  username: string;
  role: string;
  bidang: Bidang[];
}

export default function KelolaAkun() {
  const router = useRouter();

  // State Manajemen
  const [daftarAkun, setDaftarAkun] = useState<Akun[]>([]);
  const [daftarAksesTersedia, setDaftarAksesTersedia] = useState<Bidang[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State untuk Modal Tambah Akun
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAkun, setNewAkun] = useState({ username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Modal Tambah Akses (Bubble +)
  const [aksesModalAkunId, setAksesModalAkunId] = useState<number | null>(null);

  // Fungsi Fetch Data Utama dengan Handling Token
  const fetchSemuaData = async () => {
    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }

    try {
      // 1. Cek Sesi (Refresh token jika perlu)
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }

      // 2. Fetch Data Akun
      const akunRes = await fetch('/api/akun/list', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });
      
      // 3. Fetch Master Data Akses (Bidang)
      const aksesRes = await fetch('/api/akun/akses', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (akunRes.ok && aksesRes.ok) {
        const akunData = await akunRes.json();
        const aksesData = await aksesRes.json();
        setDaftarAkun(akunData.akuns);
        setDaftarAksesTersedia(aksesData.access);
      } else {
        throw new Error("Gagal mengambil data dari server");
      }
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes("Sesi")) router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSemuaData();
  }, []);

  // API Helper function
  const apiCall = async (url: string, method: string, body?: any) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Terjadi kesalahan');
    }
    return res.json();
  };

  // --- HANDLER FUNGSI ---
  const handleTambahAkun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await apiCall('/api/akun/tambah', 'POST', newAkun);
      setShowAddModal(false);
      setNewAkun({ username: '', password: '' });
      fetchSemuaData(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapusAkun = async (akunID: number, username: string) => {
    // Menghapus tanpa minta password, cukup konfirmasi JS standar
    if (!confirm(`Apakah Anda yakin ingin menghapus akun '${username}'?`)) return;
    try {
      await apiCall(`/api/akun/hapus/${akunID}`, 'DELETE');
      fetchSemuaData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTambahAkses = async (akunID: number, bidangID: number) => {
    try {
      await apiCall(`/api/akun/tambah-akses/${akunID}/${bidangID}`, 'POST');
      setAksesModalAkunId(null);
      fetchSemuaData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleHapusAkses = async (akunID: number, bidangID: number) => {
    if (!confirm('Hapus akses ini?')) return;
    try {
      await apiCall(`/api/akun/hapus-akses/${akunID}/${bidangID}`, 'DELETE');
      fetchSemuaData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Render Loader
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-full">
        <div className="text-red-500 text-xl font-bold animate-pulse">Memuat Data Akun...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Pesan Error Global */}
      {error && !showAddModal && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 font-medium">
          Error: {error}
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">Kelola Akun</h1>
          <p className="text-slate-500 text-sm md:text-base">Manajemen admin dan hak akses bidang.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-0.5 flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> Tambah Akun Baru
        </button>
      </header>

      {/* Tabel Data Akun */}
      <div className="bg-[#18181b] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white">Daftar Admin</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold">ID</th>
                <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold">Username</th>
                <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold">Hak Akses (Bidang)</th>
                <th className="p-6 text-xs uppercase tracking-widest text-slate-500 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {daftarAkun.map((akun) => (
                <tr key={akun.akunID} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-6 text-slate-400 text-sm font-mono">#{akun.akunID}</td>
                  <td className="p-6">
                    <div className="font-bold text-white">{akun.username}</div>
                    <div className="text-xs text-red-400 mt-1">{akun.role}</div>
                  </td>
                  <td className="p-6 max-w-md">
                    <div className="flex flex-wrap gap-2 items-center">
                      
                      {/* BUBBLE AKSES */}
                      {akun.bidang.map(b => (
                        <span key={b.bidangID} className="group inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-slate-300 font-medium transition-colors">
                          {b.nama}
                          <button 
                            onClick={() => handleHapusAkses(akun.akunID, b.bidangID)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                            title="Cabut Akses"
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {/* TOMBOL BUBBLE (+) UNTUK TAMBAH AKSES */}
                      <div className="relative">
                        <button 
                          onClick={() => setAksesModalAkunId(aksesModalAkunId === akun.akunID ? null : akun.akunID)}
                          className="inline-flex items-center justify-center w-6 h-6 bg-red-600/10 hover:bg-red-600 border border-red-600/20 hover:border-red-500 rounded-full text-red-500 hover:text-white transition-all text-xs font-bold"
                          title="Tambah Akses"
                        >
                          +
                        </button>

                      </div>

                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleHapusAkun(akun.akunID, akun.username)}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-sm font-semibold transition-all border border-red-500/20 hover:border-red-500"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {daftarAkun.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">Belum ada akun yang terdaftar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL TAMBAH AKUN --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Tambah Akun Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            
            <form onSubmit={handleTambahAkun} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Username</label>
                <input 
                  type="text" 
                  required
                  value={newAkun.username}
                  onChange={(e) => setNewAkun({...newAkun, username: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  placeholder="Masukkan username unik"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Password</label>
                <input 
                  type="password" 
                  required
                  value={newAkun.password}
                  onChange={(e) => setNewAkun({...newAkun, password: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all border border-white/5"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- MODAL TAMBAH AKSES (OVERRIDE HALAMAN) --- */}
      {aksesModalAkunId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Area luar modal yang bisa diklik untuk menutup (Click Outside) */}
          <div className="absolute inset-0" onClick={() => setAksesModalAkunId(null)}></div>
          
          {/* Kotak Modal */}
          <div className="relative bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-white">Tambah Akses Bidang</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih akses baru untuk <span className="font-semibold text-red-500">{daftarAkun.find(a => a.akunID === aksesModalAkunId)?.username}</span>
                </p>
              </div>
              <button onClick={() => setAksesModalAkunId(null)} className="text-slate-500 hover:text-red-400 text-xl transition-colors">✕</button>
            </div>
            
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {(() => {
                // Cari data akun yang sedang di-klik berdasarkan ID-nya
                const selectedAkun = daftarAkun.find(a => a.akunID === aksesModalAkunId);
                
                // Jika tidak ketemu, return kosong
                if (!selectedAkun) return null;

                // Saring akses yang BELUM dimiliki oleh akun tersebut
                const aksesBelumDimiliki = daftarAksesTersedia.filter(
                  a => !selectedAkun.bidang.some(b => b.bidangID === a.bidangID)
                );

                if (aksesBelumDimiliki.length === 0) {
                  return (
                    <div className="p-6 text-center text-sm text-slate-500 bg-white/5 rounded-xl border border-white/5">
                      Akun ini sudah memiliki semua akses.
                    </div>
                  );
                }

                // Render tombol pilihan akses
                return (
                  <div className="space-y-1.5">
                    {aksesBelumDimiliki.map(akses => (
                      <button
                        key={akses.bidangID}
                        onClick={() => handleTambahAkses(selectedAkun.akunID, akses.bidangID)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all group"
                      >
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                          {akses.nama}
                        </span>
                        <span className="text-red-500/50 group-hover:text-red-500 font-bold transition-colors">
                          +
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}