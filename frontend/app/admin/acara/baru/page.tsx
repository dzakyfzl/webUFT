"use client";

import React, { useState } from 'react';
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
  const [status, setStatus] = useState('Draft');
  
  // State khusus untuk File Poster
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState('');

  // State untuk UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const jamOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const menitOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Fungsi untuk menangani pemilihan file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validasi tipe file di sisi client (mencocokkan dengan backend kamu)
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar (JPG, PNG, dll).');
        setPosterFile(null);
        setPosterPreview('');
        return;
      }
      
      setPosterFile(file);
      // Membuat URL lokal untuk preview gambar
      setPosterPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    let finalFileId = 0; // Default jika tidak ada gambar yang diunggah

    try {
      // TAHAP 1: Unggah Poster (Jika ada)
      if (posterFile) {
        const formData = new FormData();
        formData.append('file', posterFile); // 'file' disesuaikan dengan parameter UploadFile di backend

        const uploadResponse = await fetch('/api/file/tambah', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // CATATAN PENTING: Jangan set 'Content-Type' secara manual saat mengirim FormData!
            // Browser akan otomatis mengatur tipe multipart/form-data beserta boundary-nya.
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Gagal mengunggah poster.');
        }

        const uploadData = await uploadResponse.json();
        finalFileId = uploadData.file_id; // Simpan ID untuk digunakan di tahap 2
      }

      // TAHAP 2: Simpan Data Acara
      const waktuFormatGabungan = `${tanggal} ${jam}:${menit}:00`;

      const acaraResponse = await fetch('/api/acara/tambah', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nama: nama,
          deskripsi: deskripsi,
          tempat: tempat,
          waktu: waktuFormatGabungan,
          fileID: finalFileId, // Menggunakan ID asli dari database file
          status: status
        })
      });

      if (!acaraResponse.ok) {
        const errorData = await acaraResponse.json();
        throw new Error(errorData.message || 'Gagal menambahkan data acara.');
      }

      // Kembali ke dashboard jika semuanya sukses
      router.push('/admin');
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

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
                  required rows="4" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}
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
                    {/* Menampilkan Preview Gambar */}
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

                {/* Input File Tersembunyi tapi menutupi seluruh area */}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              </div>
            </div>
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