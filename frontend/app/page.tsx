"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// --- DATA DUMMY ACARA UNGGULAN (DIPERBARUI DENGAN ID SPESIFIK) ---
const featuredEvents = [
  {
    id: 1, // ID Unik
    title: "Gelar Karya Fotografi UKM 2026",
    description: "Pameran tunggal karya visual terbaik tahun ini. Jelajahi sudut pandang baru melalui lensa para kreator berbakat kami.",
    image: "https://images.unsplash.com/photo-1533619043865-1c2e2f32ff2f?q=80&w=2000",
    link: "/katalog/karya?acaraId=1" // Mengarahkan ke katalog Acara ID 1
  },
  {
    id: 2,
    title: "Seminar Visual & Masa Depan Teknologi",
    description: "Diskusi mendalam tentang bagaimana teknologi AI dan Web3 mendefinisikan ulang batas-batas seni visual.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000",
    link: "/katalog/karya?acaraId=2" // Mengarahkan ke katalog Acara ID 2
  },
  {
    id: 3,
    title: "Kompetisi Desain Poster Kampus",
    description: "Ajang unjuk gigi bagi desainer muda. Pilih desain favoritmu dan tentukan pemenangnya.",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2000",
    link: "/katalog/karya?acaraId=3"
  }
];

// --- DATA DUMMY SEMUA ACARA (UNTUK GRID BAWAH) ---
const allEvents = [
    { id: 1, title: "Pameran Fotografi Tahunan", category: "Pameran", image: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=800" },
    { id: 2, title: "Seminar Bedah Karya Visual", category: "Seminar", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800" },
    { id: 3, title: "Lomba Desain Poster Nasional", category: "Kompetisi", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800" },
    { id: 4, title: "Workshop Pengolahan Citra", category: "Workshop", image: "https://images.unsplash.com/photo-1533619043865-1c2e2f32ff2f?q=80&w=800" },
];

// --- KOMPONEN KARTU EVENT ---
const EventCard = ({ title, category, image, href }: { title: string, category: string, image: string, href: string }) => (
  <Link href={href} className="block group">
    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-200 cursor-pointer transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl border-2 border-transparent group-hover:border-red-500">
      <Image src={image} alt={title} fill className="object-cover transition-transform duration-700 group-hover:scale-110"/>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent bottom-0" />
      <div className="absolute bottom-0 left-0 p-5 w-full z-10">
        <span className="inline-block px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full mb-2 uppercase tracking-wider">
          {category}
        </span>
        <p className="text-sm md:text-base font-bold text-white line-clamp-2 tracking-wide leading-snug">
          {title}
        </p>
      </div>
    </div>
  </Link>
);

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === featuredEvents.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 font-sans antialiased">
      {/* =========================================
          HERO SECTION 
          ========================================= */}
      <section className="relative h-[100svh] bg-slate-950 text-white overflow-hidden flex flex-col justify-center items-center text-center">
        {featuredEvents.map((event, index) => (
          <div key={event.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-40' : 'opacity-0'}`}>
            <Image src={event.image} alt={event.title} fill className="object-cover" priority={index === 0} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-0" />

        {/* --- HEADER --- */}
        <header className="absolute top-0 w-full z-50 flex justify-between items-center px-6 py-5 md:px-12 md:py-8 bg-transparent">
          <Link href="/"><Image src="/logo.png" alt="Logo" width={150} height={40} className="h-8 w-auto md:h-10" priority /></Link>
          <nav className="flex items-center gap-4 text-xs md:text-sm font-bold tracking-wide">
            <Link href="/signin" className="text-white hover:text-red-400 transition-colors">Sign In</Link>
            <Link href="/signup" className="px-5 py-2 md:px-6 md:py-2.5 bg-red-600 hover:bg-red-500 rounded-full text-white transition-all transform hover:-translate-y-0.5">Sign Up</Link>
          </nav>
        </header>

        {/* --- ISI TEKS SLIDE --- */}
        <div className="relative z-10 p-6 max-w-5xl mx-auto flex flex-col items-center mt-12">
          {featuredEvents.map((event, index) => (
            <div key={event.id} className={`transition-all duration-700 absolute w-full flex flex-col items-center ${index === currentSlide ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-8 absolute pointer-events-none'}`}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white mb-6 leading-tight drop-shadow-lg">{event.title}</h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-200 mb-10 max-w-2xl drop-shadow-md">{event.description}</p>
              <Link href={event.link}><button className="rounded-full bg-red-600 hover:bg-red-500 px-8 py-3.5 md:px-10 md:py-4 text-sm md:text-base font-bold text-white transition-all hover:scale-105 shadow-xl hover:shadow-red-600/50">Lihat Isi Acara</button></Link>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          DAFTAR SEMUA ACARA
          ========================================= */}
      <section className="max-w-7xl mx-auto p-6 py-16 md:p-16 md:py-24">
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-10">Jelajahi Semua Acara</h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
          {allEvents.map(event => (
            // Link dinamis berdasarkan ID acara
            <EventCard key={event.id} title={event.title} category={event.category} image={event.image} href={`/katalog/karya?acaraId=${event.id}`} />
          ))}
        </div>
      </section>
    </main>
  );
}