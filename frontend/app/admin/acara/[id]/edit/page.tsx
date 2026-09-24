"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/app/components/Toast';

type MapPickerProps = { lat: string; lon: string; onPick: (lat: string, lon: string) => void };
const MapPicker = dynamic<MapPickerProps>(() => import('@/app/components/MapPicker'), { ssr: false });

export default function EditAcara({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const acaraId = resolvedParams.id;

  // --- STATES UI ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // --- STATES FORM DATA ---
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
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);

  // --- STATES GEOFENCE ---
  const [geoAktif, setGeoAktif] = useState(false);
  const [geoLat, setGeoLat] = useState('');
  const [geoLon, setGeoLon] = useState('');
  const [geoRadius, setGeoRadius] = useState('100');
  const [geoToleransi, setGeoToleransi] = useState('20');

  // --- STATES FILE POSTER ---
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>('');

  // Generate opsi waktu
  const jamOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const menitOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // FETCH DATA ACARA LAMA SAAT HALAMAN DIMUAT
  useEffect(() => {
    const fetchAcara = async () => {
      const accesstoken = localStorage.getItem('access_token');
      if (!accesstoken) {
        router.push('/admin/login');
        return;
      }

      try {
        const response = await fetch(`/api/acara/admin-ambil/${acaraId}`, {
          headers: { 'Authorization': `Bearer ${accesstoken}` }
        });
        const refreshtoken = localStorage.getItem('refresh_token');
      if (response.status === 401) {
          localStorage.removeItem('access_token');
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshtoken}`
            }
          });
          const accessTokenResponse = await refreshResponse.json();
          if (refreshResponse.ok) {
            localStorage.setItem('access_token', accessTokenResponse.access_token);
          } else {
            router.push('/admin/login');
            return;
          }

        }

        if (!response.ok) throw new Error('Gagal memuat data acara');
        const data = await response.json();

        // Mengisi Form dengan data yang ada
        setNama(data.nama);
        setDeskripsi(data.deskripsi);
        setTempat(data.tempat);
        setStatus(data.status);
        setCurrentFileId(data.fileID);

        // Populasi data geofence jika ada
        if (data.geo_latitude != null && data.geo_longitude != null && data.geo_radius != null) {
          setGeoAktif(true);
          setGeoLat(String(data.geo_latitude));
          setGeoLon(String(data.geo_longitude));
          setGeoRadius(String(data.geo_radius));
          if (data.geo_toleransi != null) setGeoToleransi(String(data.geo_toleransi));
        }

        // Memecah format "YYYY-MM-DD HH:MM:SS" menjadi Tanggal, Jam, dan Menit
        if (data.waktu) {
          const cleanedWaktu = data.waktu.replace('T', ' ');
          const [tglPart, waktuPart] = cleanedWaktu.split(' ');
          if (tglPart) setTanggal(tglPart);
          if (waktuPart) {
            const [j, m] = waktuPart.split(':');
            if (j) setJam(j);
            if (m) setMenit(m);
          }
        }

        // Memecah format "YYYY-MM-DD HH:MM:SS" menjadi Tanggal Selesai, Jam Selesai, dan Menit Selesai
        if (data.waktu_selesai) {
          const cleanedWaktuSelesai = data.waktu_selesai.replace('T', ' ');
          const [tglSelesaiPart, waktuSelesaiPart] = cleanedWaktuSelesai.split(' ');
          if (tglSelesaiPart) setTanggalSelesai(tglSelesaiPart);
          if (waktuSelesaiPart) {
            const [j, m] = waktuSelesaiPart.split(':');
            if (j) setJamSelesai(j);
            if (m) setMenitSelesai(m);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAcara();
  }, [acaraId, router]);

  // HANDLE PEMILIHAN FILE BARU
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar!');
        return;
      }
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file)); // Membuat URL lokal untuk preview file baru
    }
  };

  // Fungsi ambil GPS admin
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
  const handleGpsCurrent = () => {
    if (!navigator.geolocation) {
      setGpsToast('Browser tidak mendukung Geolocation.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(7));
        setGeoLon(pos.coords.longitude.toFixed(7));
        setIsGettingGps(false);
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser.' :
          err.code === 2 ? 'Lokasi tidak dapat dideteksi. Pastikan GPS aktif dan coba di area terbuka.' :
          'Waktu habis saat mengambil lokasi. Coba lagi.';
        setGpsToast(msg);
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // HANDLE SUBMIT PERUBAHAN
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const accesstoken = localStorage.getItem('access_token');
    if (!accesstoken) return;

    try {
      let finalFileId = currentFileId; // Gunakan ID lama sebagai default

      // TAHAP 1: JIKA ADA POSTER BARU, UNGGAH DULU!
      if (posterFile) {
        const formData = new FormData();
        formData.append('file', posterFile);

        const uploadRes = await fetch('/api/file/tambah', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accesstoken}` }, // Ingat: Jangan set Content-Type manual untuk FormData
          body: formData
        });
        const refreshtoken = localStorage.getItem('refresh_token');
      if (uploadRes.status === 401) {
          localStorage.removeItem('access_token');
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshtoken}`
            }
          });
          const accessTokenResponse = await refreshResponse.json();
          if (refreshResponse.ok) {
            localStorage.setItem('access_token', accessTokenResponse.access_token);
          } else {
            router.push('/admin/login');
            return;
          }

        }

        if (!uploadRes.ok) throw new Error('Gagal mengunggah poster baru');
        const uploadData = await uploadRes.json();
        finalFileId = uploadData.file_id; // Timpa dengan ID poster yang baru
      }

      // TAHAP 2: SIMPAN DATA ACARA YANG TELAH DIEDIT
      const waktuFormatGabungan = `${tanggal} ${jam}:${menit}:00`;
      const waktuSelesaiFormatGabungan = `${tanggalSelesai} ${jamSelesai}:${menitSelesai}:00`;

      const updateRes = await fetch(`/api/acara/edit/${acaraId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accesstoken}`,
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
          // Geofence — null kalau dinonaktifkan (untuk reset ke backward-compatible mode)
          geo_latitude:  geoAktif && geoLat  ? parseFloat(geoLat)          : null,
          geo_longitude: geoAktif && geoLon  ? parseFloat(geoLon)          : null,
          geo_radius:    geoAktif && geoRadius ? (parseInt(geoRadius) || 100) : null,
          geo_toleransi: geoAktif && geoToleransi ? (parseInt(geoToleransi) || 20) : null,
        })
      });
      const refreshtoken = localStorage.getItem('refresh_token');
      if (updateRes.status === 401) {
          localStorage.removeItem('access_token');
          const refreshResponse = await fetch('/api/akun/access-token', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshtoken}`
            }
          });
          const accessTokenResponse = await refreshResponse.json();
          if (refreshResponse.ok) {
            localStorage.setItem('access_token', accessTokenResponse.access_token);
          } else {
            router.push('/admin/login');
            return;
          }

        }

      if (!updateRes.ok) throw new Error('Gagal menyimpan perubahan informasi acara');

      alert('Perubahan berhasil disimpan!');
      router.push(`/admin/acara/${acaraId}`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center text-red-500 font-bold animate-pulse">Memuat Data Form...</div>;

  return (
    <>
      {gpsToast && (
        <Toast
          message={gpsToast}
          type="error"
          onClose={() => setGpsToast(null)}
        />
      )}
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href={`/admin/acara/${acaraId}`} className="text-sm text-slate-500 hover:text-red-500 transition-colors mb-8 inline-block font-bold">
          ← Kembali ke Pusat Kendali Acara
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Edit Informasi Acara</h1>
          <p className="text-slate-500">Perbarui detail pameran atau kompetisi (ID: {acaraId}) di bawah ini.</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-8 bg-[#18181b] p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* KOLOM KIRI: FORM TEKS (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Nama Acara</label>
                <input 
                  type="text" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Lokasi / Tempat</label>
                <input 
                  type="text" 
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all" 
                  required
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
                <label className="block text-sm font-bold text-slate-400 mb-2">Status Publikasi Acara</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all appearance-none cursor-pointer"
                >
                  <option value="Draft">Draft (Disembunyikan)</option>
                  <option value="Aktif">Aktif (Dipublikasikan)</option>
                  <option value="Mendatang">Mendatang</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Deskripsi Acara</label>
                <textarea
                  rows={4}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all resize-none"
                  required
                ></textarea>
              </div>
            </div>

            {/* KOLOM KANAN: UPLOAD & PREVIEW POSTER (1/3) */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-bold text-slate-400 mb-2">Thumbnail / Poster</label>
              
              <div className="relative border-2 border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center bg-[#0f0f11]/50 hover:bg-[#0f0f11] hover:border-red-500/50 transition-all group overflow-hidden min-h-[300px]">
                
                {/* Menampilkan Gambar Preview Baru ATAU Gambar Asli dari Backend */}
                {(posterPreview || currentFileId) ? (
                  <>
                    <img 
                      // Jika ada file baru, tampilkan preview lokal. Jika tidak, ambil dari endpoint backend
                      src={posterPreview ? posterPreview : `/api/file/ambil/${currentFileId}`} 
                      alt="Preview Poster" 
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                    <div className="relative z-10 bg-black/60 px-4 py-2 rounded-lg text-sm font-medium text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                      <span>Klik untuk mengganti</span>
                      {posterFile && <span className="text-red-400 text-xs mt-1">(File baru disiapkan)</span>}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="w-12 h-12 bg-white/5 text-slate-400 group-hover:text-red-500 rounded-full flex items-center justify-center text-xl mb-2 transition-all">🖼️</div>
                    <p className="text-slate-300 font-bold text-sm mb-1">Unggah Poster</p>
                  </div>
                )}

                {/* Input File Menutupi Seluruh Area */}
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
                {/* Peta pinpoint */}
                <MapPicker
                  lat={geoLat}
                  lon={geoLon}
                  onPick={(lat, lon) => { setGeoLat(lat); setGeoLon(lon); }}
                />

                {/* Tombol GPS saat ini */}
                <button
                  type="button"
                  id="btn-gunakan-lokasi-saya-edit"
                  onClick={handleGpsCurrent}
                  disabled={isGettingGps}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-slate-300 transition-all disabled:opacity-50"
                >
                  {isGettingGps ? '⏳ Mendapatkan lokasi...' : '📡 Gunakan Lokasi Saya (GPS)'}
                </button>

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

                {geoLat && geoLon && (
                  <div className="flex items-start gap-2 p-4 bg-red-500/5 border border-red-500/15 rounded-xl text-xs text-red-300">
                    <span className="text-base">🗺️</span>
                    <span>Vote hanya bisa dilakukan dalam radius <strong>{geoRadius}m</strong> (+{geoToleransi}m toleransi) dari titik [{parseFloat(geoLat).toFixed(5)}, {parseFloat(geoLon).toFixed(5)}]</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-1 font-bold py-4 rounded-xl transition-all shadow-lg ${
                isSubmitting ? 'bg-red-800 text-white/50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
              }`}
            >
              {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </button>
            <Link href={`/admin/acara/${acaraId}`} className="flex-1">
              <button type="button" className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 text-center block">
                Batalkan
              </button>
            </Link>
          </div>
        </form>
      </div>
    </main>
    </>
  );
}