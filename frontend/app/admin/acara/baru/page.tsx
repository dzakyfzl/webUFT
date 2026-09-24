"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BuatAcaraBaru() {
  const router = useRouter();

  // State untuk Data Form Teks
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [tempat, setTempat] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('08');
  const [menit, setMenit] = useState('00');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('16');
  const [menitSelesai, setMenitSelesai] = useState('00');
  const [status, setStatus] = useState('Draft');

  // State untuk Geofence
  const [geoAktif, setGeoAktif] = useState(false);
  const [geoLat, setGeoLat] = useState('');
  const [geoLon, setGeoLon] = useState('');
  const [geoRadius, setGeoRadius] = useState('100');
  const [geoToleransi, setGeoToleransi] = useState('20');
  const [isGettingGps, setIsGettingGps] = useState(false);

  // State khusus untuk File Poster
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState('');

  // State untuk UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const jamOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const menitOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Mengecek otentikasi saat halaman pertama kali dimuat
  useEffect(() => {
    const validateToken = async () => {
      // Ambil token di dalam useEffect agar aman dari error SSR Next.js
      const accesstoken = localStorage.getItem('access_token');
      const refreshtoken = localStorage.getItem('refresh_token');

      if (!accesstoken || !refreshtoken) {
        router.push('/admin/login');
        return;
      }

      try {
        const response = await fetch('/api/akun/me', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accesstoken}` }
        });

        if (!response.ok) {
          localStorage.removeItem('access_token');
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${refreshtoken}` }
          });
          
          if (refreshResponse.ok) {
            const accessTokenResponse = await refreshResponse.json();
            localStorage.setItem('access_token', accessTokenResponse.access_token);
          } else {
            router.push('/admin/login');
            return;
          }
        }
      } catch (err) {
        console.error('Error validating token:', err);
        router.push('/admin/login');
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    validateToken();
  }, [router]);

  // Fungsi untuk menangani pemilihan file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar (JPG, PNG, dll).');
        setPosterFile(null);
        setPosterPreview('');
        return;
      }
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  // Fungsi ambil GPS admin untuk set titik pusat geofence
  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      setError('Browser tidak mendukung Geolocation.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(7));
        setGeoLon(pos.coords.longitude.toFixed(7));
        setIsGettingGps(false);
      },
      () => {
        setError('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin diberikan.');
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      setError('Browser Anda tidak mendukung geolocation.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(7));
        setGeoLon(pos.coords.longitude.toFixed(7));
        setIsGettingGps(false);
      },
      () => {
        setError('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan di browser.');
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Ambil token langsung saat tombol ditekan
    const accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken) {
      router.push('/admin/login');
      return;
    }

    let finalFileId: number | null = null; 

    try {
      // TAHAP 1: Unggah Poster (Jika ada)
      if (posterFile) {
        const formData = new FormData();
        formData.append('file', posterFile); 

        const uploadResponse = await fetch('/api/file/tambah', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accesstoken}` },
          body: formData
        });

        if (uploadResponse.status === 401) {
          localStorage.removeItem('access_token');
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${refreshtoken}` }
          });
          
          if (refreshResponse.ok) {
            const accessTokenResponse = await refreshResponse.json();
            localStorage.setItem('access_token', accessTokenResponse.access_token);
            // Idealnya di sini kita me-retry ulang upload file, tapi untuk sementara kita lempar error
            // agar user menekan tombol simpan sekali lagi
            throw new Error('Sesi diperbarui. Silakan tekan tombol Simpan sekali lagi.');
          } else {
            router.push('/admin/login');
            return;
          }
        }
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Gagal mengunggah poster.');
        }

        const uploadData = await uploadResponse.json();
        finalFileId = uploadData.file_id; 
      }

      // TAHAP 2: Simpan Data Acara
      const waktuFormatGabungan = `${tanggal} ${jam}:${menit}:00`;
      const waktuSelesaiFormatGabungan = `${tanggalSelesai} ${jamSelesai}:${menitSelesai}:00`;
      
      // Karena token mungkin baru diperbarui di Tahap 1, kita ambil ulang
      const currentAccessToken = localStorage.getItem('access_token');

      const acaraResponse = await fetch('/api/acara/tambah', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nama: nama,
          deskripsi: deskripsi,
          tempat: tempat,
          waktu: waktuFormatGabungan,
          waktu_selesai: waktuSelesaiFormatGabungan,
          fileID: finalFileId,
          status: status,
          // Geofence — hanya kirim jika diaktifkan dan lat/lon terisi
          ...(geoAktif && geoLat && geoLon ? {
            geo_latitude: parseFloat(geoLat),
            geo_longitude: parseFloat(geoLon),
            geo_radius: parseInt(geoRadius) || 100,
            geo_toleransi: parseInt(geoToleransi) || 20,
          } : {}),
        })
      });

      if (acaraResponse.status === 401) {
          localStorage.removeItem('access_token');
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${refreshtoken}` }
          });
          
          if (refreshResponse.ok) {
            const accessTokenResponse = await refreshResponse.json();
            localStorage.setItem('access_token', accessTokenResponse.access_token);
            throw new Error('Sesi diperbarui. Silakan tekan tombol Simpan sekali lagi.');
          } else {
            router.push('/admin/login');
            return;
          }
      }

      if (!acaraResponse.ok) {
        const errorData = await acaraResponse.json();
        throw new Error(errorData.message || 'Gagal menambahkan data acara.');
      }

      // Kembali ke dashboard jika semuanya sukses
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Mencegah halaman berkedip form sebelum otentikasi selesai
  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center text-red-500 font-bold animate-pulse">Memverifikasi Sesi...</div>;
  }

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 font-sans pb-12">
      <nav className="bg-[#18181b] border-b border-white/5 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
            <span>←</span>
          </Link>
          <span className="font-bold text-white tracking-wide">Buat Acara Baru</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 mt-6">
        <form onSubmit={handleSubmit} className="bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Detail Informasi Acara</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Kolom Kiri: Form Teks (Porsi 2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Nama Acara</label>
                <input 
                  type="text" required value={nama} onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all"
                  placeholder="Contoh: Pameran Fotografi 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Deskripsi Acara</label>
                <textarea 
                  required rows={4} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all resize-none"
                  placeholder="Tuliskan detail dan tujuan acara ini..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Lokasi / Tempat</label>
                <input 
                  type="text" required value={tempat} onChange={(e) => setTempat(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all"
                  placeholder="Contoh: Gedung Serbaguna Kampus"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border border-white/5 rounded-2xl bg-white/[0.02]">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all color-scheme-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Waktu (Jam & Menit)</label>
                  <div className="flex gap-3">
                    <select value={jam} onChange={(e) => setJam(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none">
                      {jamOptions.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <span className="flex items-center text-xl font-bold">:</span>
                    <select value={menit} onChange={(e) => setMenit(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none">
                      {menitOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border border-white/5 rounded-2xl bg-white/[0.02]">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Tanggal Selesai</label>
                  <input 
                    type="date" required value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all color-scheme-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Waktu Selesai (Jam & Menit)</label>
                  <div className="flex gap-3">
                    <select value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none">
                      {jamOptions.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <span className="flex items-center text-xl font-bold">:</span>
                    <select value={menitSelesai} onChange={(e) => setMenitSelesai(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none">
                      {menitOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Status Publikasi</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none">
                  <option value="Draft">Draft (Disembunyikan)</option>
                  <option value="Aktif">Aktif (Dipublikasikan)</option>
                  <option value="Mendatang">Mendatang</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            {/* Kolom Kanan: Upload Poster (Porsi 1/3) */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-400 mb-2">Poster Acara</label>
              
              <div className="border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-2xl p-4 transition-all bg-[#0f0f11] group relative flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                
                {posterPreview ? (
                  <>
                    <img 
                      src={posterPreview} 
                      alt="Preview Poster" 
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                    <div className="relative z-10 bg-black/60 px-4 py-2 rounded-lg text-sm font-medium text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      Klik untuk mengganti
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                      <span className="text-2xl">📸</span>
                    </div>
                    <span className="text-sm font-medium text-slate-400 text-center">
                      Unggah Poster<br/>
                      <span className="text-xs text-slate-500">(JPG, PNG, WebP)</span>
                    </span>
                  </>
                )}

                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              </div>
            </div>
          </div>

          {/* Seksi Geofence */}
          <div className="mt-8 border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">📍 Pembatasan Lokasi Voting</h3>
                <p className="text-xs text-slate-500 mt-0.5">Aktifkan agar vote hanya bisa dilakukan di area tertentu</p>
              </div>
              <button
                type="button"
                id="btn-toggle-geofence"
                onClick={() => setGeoAktif(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#18181b] ${
                  geoAktif ? 'bg-red-600 focus:ring-red-500' : 'bg-white/10 focus:ring-white/20'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                  geoAktif ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {geoAktif && (
              <div className="p-6 space-y-5 border-t border-white/5">
                {/* Koordinat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Latitude</label>
                    <input
                      type="number" step="any"
                      value={geoLat} onChange={e => setGeoLat(e.target.value)}
                      placeholder="contoh: -6.9175"
                      className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Longitude</label>
                    <input
                      type="number" step="any"
                      value={geoLon} onChange={e => setGeoLon(e.target.value)}
                      placeholder="contoh: 107.6191"
                      className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Tombol GPS */}
                <button
                  type="button"
                  id="btn-gunakan-lokasi-saya"
                  onClick={handleGpsClick}
                  disabled={isGettingGps}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-slate-300 transition-all disabled:opacity-50"
                >
                  {isGettingGps ? '⏳ Mendapatkan lokasi...' : '📍 Gunakan Lokasi Saya Sekarang'}
                </button>

                {/* Radius & Toleransi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Radius (meter)</label>
                    <select
                      value={geoRadius} onChange={e => setGeoRadius(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none text-sm"
                    >
                      <option value="50">50 meter</option>
                      <option value="100">100 meter</option>
                      <option value="200">200 meter</option>
                      <option value="500">500 meter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Toleransi GPS (meter)</label>
                    <select
                      value={geoToleransi} onChange={e => setGeoToleransi(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-red-500 bg-[#0f0f11] text-white outline-none appearance-none text-sm"
                    >
                      <option value="10">10 meter</option>
                      <option value="20">20 meter (default)</option>
                      <option value="50">50 meter</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                {geoLat && geoLon && (
                  <div className="flex items-start gap-2 p-4 bg-red-500/5 border border-red-500/15 rounded-xl text-xs text-red-300">
                    <span className="text-base">🗺️</span>
                    <span>Vote hanya bisa dilakukan dalam radius <strong>{geoRadius}m</strong> (+{geoToleransi}m toleransi) dari titik [{parseFloat(geoLat).toFixed(5)}, {parseFloat(geoLon).toFixed(5)}]</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Aksi */}
          <div className="mt-10 flex justify-end gap-4 border-t border-white/5 pt-6">
            <Link href="/admin">
              <button type="button" className="px-6 py-3 rounded-xl font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                Batal
              </button>
            </Link>
            <button 
              type="submit" 
              disabled={isLoading}
              className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] ${
                isLoading ? 'bg-red-800 opacity-70 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Acara'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}