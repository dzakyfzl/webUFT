"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function TambahAcara() {
  // State untuk menyimpan data file gambar yang diunggah
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-red-500 transition-colors mb-8 inline-block font-bold">
          ← Kembali ke Dashboard
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Buat Acara Pameran Baru</h1>
          <p className="text-slate-500">Isi detail di bawah untuk mendaftarkan pameran atau kompetisi baru ke sistem.</p>
        </header>

        <form className="space-y-8 bg-[#18181b] p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Nama Acara</label>
              <input type="text" placeholder="Contoh: Gelar Karya Fotografi 2026" className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Tanggal Pelaksanaan</label>
                <input type="date" className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Status Awal</label>
                <select className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all appearance-none cursor-pointer">
                  <option>Draft</option>
                  <option>Mendatang</option>
                  <option>Aktif</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Deskripsi Acara</label>
              <textarea rows={4} placeholder="Jelaskan detail mengenai acara ini..." className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all resize-none"></textarea>
            </div>

            {/* --- AREA DRAG & DROP FILE UNTUK THUMBNAIL --- */}
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Thumbnail Pameran (Poster)</label>
              <div className="relative border-2 border-dashed border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center bg-[#0f0f11]/50 hover:bg-[#0f0f11] hover:border-red-500/50 transition-all group overflow-hidden">
                
                {/* Input File Transparan (Menutupi seluruh kotak) */}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => setThumbnail(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />

                <div className="text-center pointer-events-none">
                  {thumbnail ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center text-2xl mb-3 border border-red-500/30">
                        ✓
                      </div>
                      <p className="text-white font-bold text-sm mb-1">File Siap Diunggah:</p>
                      <p className="text-red-400 text-xs truncate max-w-[250px]">{thumbnail.name}</p>
                      <p className="text-slate-500 text-[10px] mt-4">Klik atau seret file lain untuk mengganti</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/5 text-slate-400 group-hover:text-red-500 group-hover:bg-red-600/10 rounded-full flex items-center justify-center text-2xl mb-3 border border-white/10 group-hover:border-red-500/30 transition-all">
                        📁
                      </div>
                      <p className="text-slate-300 font-bold text-sm mb-1">Tarik & Lepas gambar ke sini</p>
                      <p className="text-slate-500 text-xs">atau klik untuk menelusuri file dari perangkat</p>
                      <p className="text-slate-600 text-[10px] mt-4">Format: JPG, PNG, WEBP (Maks 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button type="button" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              Simpan Acara
            </button>
            <Link href="/admin" className="flex-1">
              <button type="button" className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10 text-center block">
                Batalkan
              </button>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}