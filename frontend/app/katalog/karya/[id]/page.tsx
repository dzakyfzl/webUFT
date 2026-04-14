"use client";

import React, { useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// --- DATA DUMMY (Kategori Dihapus) ---
const daftarKarya = [
  { id: 101, title: "Senja di Braga", author: "Budi Santoso", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=1200", description: "Tangkapan momen langka saat matahari terbenam memantulkan cahaya keemasan di genangan air jalanan bersejarah Braga. Kontras antara pejalan kaki yang bergegas dan tenangnya langit sore." },
  { id: 102, title: "Tatapan Kosong", author: "Siti Aminah", image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1200", description: "Sebuah potret mendalam dari seorang perajin tua di pasar tradisional. Guratan di wajahnya menceritakan ribuan kisah tentang kerja keras dan dedikasi yang tak lekang oleh waktu." },
  { id: 103, title: "Megahnya Sudirman", author: "Alex Wijaya", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200", description: "Geometri beton dan kaca yang menusuk langit Jakarta. Menggunakan teknik long exposure untuk menghaluskan pergerakan awan, memberikan kesan bangunan yang kokoh." },
  { id: 104, title: "Pengejar Kabut", author: "Dina Mariana", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200", description: "Lapisan pegunungan yang diselimuti kabut pagi. Perpaduan warna biru dingin dan cahaya fajar yang mencoba menembus kabut menciptakan suasana yang misterius." },
  { id: 105, title: "Pasar Tradisional", author: "Reza Rahadian", image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1200", description: "Keriuhan tawar-menawar di sudut pasar basah. Penggunaan warna hitam putih sengaja dipilih untuk memfokuskan mata pada tekstur dan ekspresi subjek." },
  { id: 106, title: "Sinar Harapan", author: "Putri Larasati", image: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1200", description: "Komposisi surealis bayangan dan cahaya yang menembus celah jendela. Menggambarkan secercah harapan yang selalu ada bahkan di ruangan yang paling gelap sekalipun." },
];

export default function DetailKarya({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const karya = daftarKarya.find(k => k.id === parseInt(id));

  const [showVoteForm, setShowVoteForm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!karya) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h1 className="text-2xl font-bold text-slate-800">Karya tidak ditemukan</h1>
        <Link href="/katalog/karya" className="mt-4 text-red-600 hover:underline">Kembali ke Katalog</Link>
      </div>
    );
  }

  const handleVoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setShowVoteForm(false);
      setIsSuccess(false);
    }, 3500);
  };

  return (
    <main className="min-h-screen bg-white font-sans flex flex-col">
      <header className="bg-white border-b border-slate-100 py-4 px-6 flex justify-between items-center sticky top-0 z-40">
        <Link href="/katalog/karya" className="text-sm font-bold text-slate-500 hover:text-red-600 flex items-center gap-2 transition-colors">
          <span>←</span> Kembali ke Katalog
        </Link>
        <div className="font-bold text-slate-300 text-xs tracking-widest uppercase">ID: {karya.id}</div>
      </header>

      <div className="flex flex-col lg:flex-row flex-grow">
        
        <div className="lg:w-3/5 bg-[#0a0a0c] relative h-[50vh] lg:h-[calc(100vh-65px)] p-4 flex items-center justify-center">
          <Image 
            src={karya.image} 
            alt={karya.title} 
            fill 
            className="object-contain p-4 md:p-8" 
            priority
          />
        </div>

        <div className="lg:w-2/5 p-8 md:p-12 flex flex-col bg-white overflow-y-auto h-auto lg:h-[calc(100vh-65px)]">
          
          <div className="flex-grow pt-4">
            {/* Label Kategori dihapus, langsung memunculkan Judul yang besar */}
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight">{karya.title}</h1>
            <p className="text-lg font-medium text-slate-500 mb-8 border-b border-slate-100 pb-6">
              Oleh <span className="text-slate-800 font-bold">{karya.author}</span>
            </p>
            
            <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">Deskripsi Karya</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              {karya.description}
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <button 
              onClick={() => setShowVoteForm(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
            >
              VOTE KARYA INI
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Satu identitas, satu vote</p>
          </div>

        </div>
      </div>

      {showVoteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] overflow-hidden max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative">
            
            {!isSuccess && (
              <button onClick={() => setShowVoteForm(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-800 bg-slate-100 rounded-full font-bold">✕</button>
            )}

            {!isSuccess ? (
              <div className="p-8 md:p-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Konfirmasi Vote</h2>
                  <p className="text-slate-500 text-xs">Anda akan memberikan suara untuk <strong>"{karya.title}"</strong>.</p>
                </div>

                <form onSubmit={handleVoteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                    <input type="text" required placeholder="Sesuai KTM / KTP" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prodi</label>
                      <input type="text" required placeholder="Telkom Univ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NIM</label>
                      <input type="text" required placeholder="Nomor Induk" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                    <input type="text" required placeholder="Misal: S1 Informatika" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                  </div>

                  <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg">
                    Kirim Vote Sekarang
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">✓</div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Vote Terkirim!</h2>
                <p className="text-slate-500 text-sm">Terima kasih telah mendukung <strong>{karya.author}</strong> di pameran ini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}