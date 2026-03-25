"use client"; // Wajib agar bisa membaca URL dinamis

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation'; // Hook untuk membaca query params

// --- DATA DUMMY NAMA ACARA (Kamus Lookup) ---
const daftarAcara = [
  { id: 1, judul: "Gelar Karya Fotografi Tahunan" },
  { id: 2, judul: "Seminar Bedah Karya Visual" },
  { id: 3, judul: "Kompetisi Desain Poster Nasional" },
  { id: 4, judul: "Workshop Pengolahan Citra" },
];

// --- DATA DUMMY KARYA ---
const allKarya = [
  // Karya milik Acara ID 1 (Pameran Fotografi)
  { id: 101, acaraId: 1, judul: "Distorsi Cahaya Malam", kategori: "Fotografi Eksperimental", image: "https://images.unsplash.com/photo-1533619043865-1c2e2f32ff2f?q=80&w=800" },
  { id: 102, acaraId: 1, judul: "Siluet Senja Kampus", kategori: "Lanskap", image: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=800" },
  { id: 103, acaraId: 1, judul: "Wajah Jalanan", kategori: "Human Interest", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800" },
  
  // Karya milik Acara ID 3 (Kompetisi Desain)
  { id: 301, acaraId: 3, judul: "Poster Anti-Hoax", kategori: "Desain Grafis", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800" },
  { id: 302, acaraId: 3, judul: "Rebranding Concept", kategori: "Seni Digital", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800" },
];

export default function KatalogKarya() {
  const searchParams = useSearchParams();
  const acaraId = searchParams.get('acaraId'); 
  const angkaAcaraId = Number(acaraId);

  // 1. Menyaring data karya berdasarkan ID
  const karyaTersaring = allKarya.filter(karya => karya.acaraId === angkaAcaraId);

  // 2. Mencari nama acara berdasarkan ID
  const detailAcara = daftarAcara.find(acara => acara.id === angkaAcaraId);
  const namaAcara = detailAcara ? detailAcara.judul : "Galeri Pameran Virtual";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header Galeri */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <Link href="/"><Image src="/logo.png" alt="Logo" width={150} height={40} className="h-8 w-auto md:h-10" priority /></Link>
        <Link href="/" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
          ← Kembali ke Beranda
        </Link>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="mb-12 border-b border-slate-200 pb-8 text-center md:text-left">
          {/* Judul langsung menggunakan Nama Acara, tanpa teks "Katalog Isi Acara" */}
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-slate-900 tracking-tight leading-tight">
            {namaAcara}
          </h1>
          <p className="text-slate-500 max-w-3xl text-sm md:text-base leading-relaxed">
            Menjelajahi ragam sudut pandang melalui lensa para kreator. Temukan karya visual yang menginspirasi, pelajari makna di baliknya, dan berikan apresiasi pada karya favorit Anda.
          </p>
        </div>

        {/* Validasi jika tidak ada karya yang ditemukan */}
        {karyaTersaring.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                <span className="text-6xl mb-4 block opacity-50">📷</span>
                <h3 className="text-xl font-bold text-slate-700">Ruang Pameran Masih Kosong</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
                  Karya visual untuk pameran ini sedang dalam proses kurasi atau belum diunggah oleh panitia. Silakan kembali lagi nanti.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {/* Grid Karya Fotografi */}
              {karyaTersaring.map((karya) => (
                <Link href={`/katalog/karya/${karya.id}`} key={karya.id}>
                  <div className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl border border-slate-100 transition-all duration-500 hover:-translate-y-2 hover:border-red-200">
                    <div className="aspect-[4/5] relative bg-slate-900 overflow-hidden">
                       <Image 
                          src={karya.image} 
                          alt={karya.judul} 
                          fill 
                          className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        />
                    </div>
                    <div className="p-6">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2 block">{karya.kategori}</span>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-red-600 transition-colors line-clamp-1">{karya.judul}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
        )}
      </div>
    </main>
  );
}