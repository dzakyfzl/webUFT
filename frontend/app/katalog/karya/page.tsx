"use client";

import React, { useState, use, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// --- DATA DUMMY KARYA FOTO ---
const daftarKarya = [
  { id: 101, title: "Senja di Braga", author: "Budi Santoso", category: "Street Photography", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=1200" },
  { id: 102, title: "Tatapan Kosong", author: "Siti Aminah", category: "Human Interest", image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1200" },
  { id: 103, title: "Megahnya Sudirman", author: "Alex Wijaya", category: "Architecture", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200" },
  { id: 104, title: "Pengejar Kabut", author: "Dina Mariana", category: "Landscape", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200" },
  { id: 105, title: "Pasar Tradisional", author: "Reza Rahadian", category: "Documentary", image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1200" },
  { id: 106, title: "Sinar Harapan", author: "Putri Larasati", category: "Fine Art", image: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1200" },
];

function KatalogContent() {
  const searchParams = useSearchParams();
  const acaraId = searchParams.get('acaraId') || '1';

  // State untuk menyimpan ID foto yang dipilih (Hanya 1 ID)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mencari data foto yang sedang dipilih
  const currentSelection = daftarKarya.find(k => k.id === selectedId);

  const handleVoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setShowModal(false);
      setIsSuccess(false);
      setSelectedId(null);
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-32 relative">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
            ← Beranda
          </Link>
          <div className="font-extrabold text-slate-800">KATALOG <span className="text-red-600 uppercase">Pameran</span></div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-12 px-6 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-2">Pilih Karya Terfavorit</h1>
          <p className="text-slate-400 text-sm md:text-base">Klik pada satu foto yang paling Anda sukai, lalu tekan tombol Vote.</p>
        </div>
      </section>

      {/* Galeri Grid */}
      <section className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
          {daftarKarya.map((karya) => (
            <div 
              key={karya.id}
              onClick={() => setSelectedId(karya.id)} // Memilih foto
              className={`group relative aspect-[3/4] rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 border-4 shadow-lg ${
                selectedId === karya.id ? 'border-red-600 scale-95 shadow-red-600/20' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <Image src={karya.image} alt={karya.title} fill className="object-cover" />
              
              {/* Indikator Centang jika Terpilih */}
              {selectedId === karya.id && (
                <div className="absolute top-4 right-4 bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                  <span className="text-xl font-bold">✓</span>
                </div>
              )}

              {/* Teks Info Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5 md:p-8">
                <h3 className="text-white font-bold text-lg md:text-xl leading-tight">{karya.title}</h3>
                <p className="text-slate-300 text-xs md:text-sm">Oleh {karya.author}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          FLOATING VOTE BUTTON
          ========================================= */}
      {selectedId && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-bottom-10 duration-500">
          <button 
            onClick={() => setShowModal(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl shadow-[0_10px_40px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            VOTE KARYA INI <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">#{selectedId}</span>
          </button>
        </div>
      )}

      {/* =========================================
          MODAL FORMULIR DATA DIRI
          ========================================= */}
      {showModal && currentSelection && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] overflow-hidden max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {!isSuccess ? (
              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Data Diri Pemilih</h2>
                    <p className="text-slate-500 text-sm">Pilihan: <span className="text-red-600 font-bold">{currentSelection.title}</span></p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 text-2xl">✕</button>
                </div>

                <form onSubmit={handleVoteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                    <input type="text" required placeholder="Sesuai KTM / KTP" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Instansi / Universitas</label>
                      <input type="text" required placeholder="Telkom University" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NIM / NIK</label>
                      <input type="text" required placeholder="Nomor Induk" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Program Studi</label>
                    <input type="text" required placeholder="Misal: S1 Informatika" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all" />
                  </div>

                  <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl mt-6 transition-all shadow-lg">
                    Konfirmasi & Kirim Vote
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Vote Berhasil Dikirim!</h2>
                <p className="text-slate-500 text-sm">Terima kasih telah mendukung karya mahasiswa di pameran UKM Fotografi Telkom University.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function KatalogKaryaPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-bold">Inisialisasi Katalog...</div>}>
      <KatalogContent />
    </Suspense>
  );
}