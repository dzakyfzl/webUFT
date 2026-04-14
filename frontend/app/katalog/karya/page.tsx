"use client";

import React, { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// --- DATA DUMMY (Kategori Dihapus) ---
const daftarKarya = [
  { id: 101, title: "Senja di Braga", author: "Budi Santoso", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=800" },
  { id: 102, title: "Tatapan Kosong", author: "Siti Aminah", image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800" },
  { id: 103, title: "Megahnya Sudirman", author: "Alex Wijaya", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800" },
  { id: 104, title: "Pengejar Kabut", author: "Dina Mariana", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800" },
  { id: 105, title: "Pasar Tradisional", author: "Reza Rahadian", image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=800" },
  { id: 106, title: "Sinar Harapan", author: "Putri Larasati", image: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=800" },
];

function KatalogContent() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
            ← Beranda
          </Link>
          <div className="font-extrabold text-slate-800 tracking-tight">Katalog <span className="text-red-600">Pameran</span></div>
        </div>
      </header>

      <section className="bg-slate-900 text-white py-16 px-6 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Galeri Pameran 2026</h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
          Klik pada karya yang menarik perhatian Anda untuk melihat detail makna, fotografer, dan memberikan dukungan *Vote*.
        </p>
      </section>

      <section className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          {daftarKarya.map((karya) => (
            <Link href={`/katalog/karya/${karya.id}`} key={karya.id}>
              <div className="group relative aspect-[3/4] rounded-2xl md:rounded-[2rem] overflow-hidden cursor-pointer bg-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <Image src={karya.image} alt={karya.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 md:p-6 opacity-90 group-hover:opacity-100 transition-opacity">
                  {/* Label Kategori dihapus, langsung fokus ke judul */}
                  <h3 className="text-white font-bold text-lg md:text-xl leading-tight">{karya.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function KatalogKaryaPage() {
  return (
    <Suspense fallback={<div>Memuat...</div>}>
      <KatalogContent />
    </Suspense>
  );
}