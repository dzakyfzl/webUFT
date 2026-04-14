"use client";

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditAcara({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  // Membuka (unwrap) params untuk Next.js 15
  const resolvedParams = use(params);
  const acaraId = resolvedParams.id;

  const [formData, setFormData] = useState({
    title: `Gelar Karya Fotografi UKM 2026 (ID: ${acaraId})`,
    date: '2026-04-10', 
    status: 'Aktif',
    description: 'Pameran tunggal karya visual terbaik tahun ini. Jelajahi sudut pandang baru melalui lensa para kreator berbakat kami.',
    thumbnailName: 'poster-utama-2026.webp'
  });

  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Sukses: Perubahan informasi pada Acara ID ${acaraId} berhasil disimpan!`);
    router.push(`/admin/acara/${acaraId}`);
  };

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href={`/admin/acara/${acaraId}`} className="text-sm text-slate-500 hover:text-red-500 transition-colors mb-8 inline-block font-bold">
          ← Kembali ke Pusat Kendali Acara
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Edit Informasi Acara</h1>
          <p className="text-slate-500">Perbarui detail pameran atau kompetisi di bawah ini.</p>
        </header>

        <form onSubmit={handleUpdate} className="space-y-8 bg-[#18181b] p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Nama Acara</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all" 
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Tanggal Pelaksanaan</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Status Acara</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all appearance-none cursor-pointer"
                >
                  <option value="Draft">Draft</option>
                  <option value="Mendatang">Mendatang</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Deskripsi Acara</label>
              <textarea 
                rows={4} 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all resize-none"
                required
              ></textarea>
            </div>

            {/* Area Drag & Drop Ganti Poster */}
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Thumbnail Pameran (Poster)</label>
              <div className="relative border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center bg-[#0f0f11]/50 hover:bg-[#0f0f11] hover:border-red-500/50 transition-all group overflow-hidden">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setThumbnail(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="text-center pointer-events-none">
                  {thumbnail ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center text-xl mb-2 border border-red-500/30">✓</div>
                      <p className="text-white font-bold text-sm mb-1">File Baru Disiapkan:</p>
                      <p className="text-red-400 text-xs truncate max-w-[200px]">{thumbnail.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white/5 text-slate-400 group-hover:text-red-500 rounded-full flex items-center justify-center text-xl mb-2 transition-all">🖼️</div>
                      <p className="text-slate-300 font-bold text-sm mb-1">Ganti Poster Pameran</p>
                      <div className="px-3 py-1.5 bg-[#18181b] border border-white/10 rounded-lg text-xs text-slate-400 mt-2">
                        File Saat Ini: <span className="text-slate-200">{formData.thumbnailName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30">
              Simpan Perubahan
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
  );
}