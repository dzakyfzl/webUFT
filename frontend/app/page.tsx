"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// --- FUNGSI FORMAT WAKTU SQL KE HH:mm DD-MM-YYYY ---
const formatSqlDate = (sqlDate: string) => {
  if (!sqlDate) return "";
  
  // Mengonversi string SQL menjadi objek Date JavaScript
  // Ganti '-' dengan '/' jika terjadi masalah parsing di browser Safari versi lama
  const dateObj = new Date(sqlDate.replace(/-/g, '/'));
  
  // Jika tanggal tidak valid, kembalikan string aslinya saja
  if (isNaN(dateObj.getTime())) return sqlDate;

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
  const year = dateObj.getFullYear();

  return `${hours}:${minutes} ${day}-${month}-${year}`;
};

// --- KOMPONEN KARTU EVENT ---
type EventCardProps = {
  title: string;
  category: string;
  image: string;
  href: string;
  waktu: string;
  tempat: string;
};

export const EventCard = ({ title, category, image, href, waktu, tempat }: EventCardProps) => (
  <Link href={href} className="block w-full group">
    <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-slate-200 cursor-pointer transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl border-2 border-transparent group-hover:border-red-500">
      
      <Image 
        src={image} 
        alt={title} 
        fill 
        className="object-cover transition-transform duration-700 group-hover:scale-110"
        unoptimized={image.startsWith('/api')} // Khusus untuk gambar dari Backend (Nginx Docker)
      />
      
      {/* Overlay Gradien Gelap */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent bottom-0" />
      
      {/* Konten Teks */}
      <div className="absolute bottom-0 left-0 p-5 w-full z-10 flex flex-col">
        {category && (
          <span className="self-start px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full mb-2 uppercase tracking-wider shadow-md">
            {category}
          </span>
        )}
        
        <p className="text-sm md:text-base font-bold text-white line-clamp-2 tracking-wide leading-snug mb-3">
          {title}
        </p>

        {/* --- DETAIL WAKTU & TEMPAT --- */}
        <div className="flex flex-col gap-1.5 text-slate-300 text-[10px] md:text-xs font-medium">
          {waktu && (
            <div className="flex items-center gap-2">
              <span className="text-sm">🗓️</span> 
              <span className="line-clamp-1">{waktu.substring(8, 10)}-{waktu.substring(5, 7)}-{waktu.substring(0, 4)}</span>
              <span className="text-sm">🕰️</span>
              <span className="line-clamp-1">{waktu.substring(11, 16)}</span>
            </div>
          )}
          {tempat && (
            <div className="flex items-center gap-2">
              <span className="text-sm">📍</span> 
              <span className="line-clamp-1">{tempat}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  </Link>
);

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA DARI BACKEND FASTAPI ---
  useEffect(() => {
    const fetchAcara = async () => {
      try {
        // Asumsi Nginx meneruskan rute /api ke backend FastAPI
        const response = await fetch('/api/acara/list');
        
        if (!response.ok) {
          console.error("Failed to fetch events. Status:", response.status);
          return;
        }

        const data = await response.json();

        // Transformasi format data database FastAPI ke format UI Frontend
        const formattedData = data.map((item: any) => ({
          id: item.acaraID,
          title: item.nama,
          description: item.deskripsi,
          waktu: item.waktu || "",     // <--- Mengambil data waktu dari API
          tempat: item.tempat || "",   // <--- Mengambil data tempat dari API
          image: item.fileID ? `/api/file/ambil/${item.fileID}` : "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=800",
          link: `/katalog/karya?acaraId=${item.acaraID}`,
          category: "Kegiatan", // Default karena di backend tidak ada kolom kategori
        }));

        // Membagi data: Misalnya 3 acara pertama masuk ke Featured Hero
        setFeaturedEvents(formattedData.slice(0, 3));
        setAllEvents(formattedData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAcara();
  }, []);

  const nextSlide = useCallback(() => {
    if (featuredEvents.length > 0) {
      setCurrentSlide((prev) => (prev === featuredEvents.length - 1 ? 0 : prev + 1));
    }
  }, [featuredEvents.length]);

  const prevSlide = () => {
    if (featuredEvents.length > 0) {
      setCurrentSlide((prev) => (prev === 0 ? featuredEvents.length - 1 : prev - 1));
    }
  };

  useEffect(() => {
    if (featuredEvents.length === 0) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, currentSlide, featuredEvents.length]);

  // Tampilkan loading state sederhana jika data belum siap
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold animate-pulse">Memuat Data Pameran...</div>;
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 font-sans antialiased flex flex-col">
      {/* =========================================
          HERO SECTION (OTOMATIS + MANUAL)
          ========================================= */}
      <section className="relative w-full h-[100svh] bg-slate-950 text-white overflow-hidden flex flex-col justify-center items-center text-center">
        {featuredEvents.length > 0 ? (
          <>
           {featuredEvents.map((event, index) => (
            <div key={event.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-40' : 'opacity-0'}`}>
              <Image 
                src={event.image} 
                alt={event.title} 
                fill 
                className="object-cover" 
                priority={index === 0} 
                unoptimized={event.image.startsWith('/api')}
              />
            </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-0" />

            <header className="absolute top-0 w-full z-50 flex justify-between items-center px-6 py-5 md:px-12 md:py-8 bg-transparent">
              <Link href="/"><Image src="/logo.png" alt="Logo" width={150} height={40} className="h-8 w-auto md:h-10" priority /></Link>
              <nav className="flex items-center gap-4 text-xs md:text-sm font-bold tracking-wide">
                <Link href="#semua-acara" className="text-white hover:text-red-400 transition-colors uppercase">Jelajahi Acara</Link>
              </nav>
            </header>

            <button onClick={prevSlide} className="absolute left-4 md:left-8 z-40 p-4 rounded-full bg-black/10 hover:bg-red-600/60 text-white transition-all hidden md:block group">
              <span className="text-3xl block group-hover:-translate-x-1 transition-transform">❮</span>
            </button>
            <button onClick={nextSlide} className="absolute right-4 md:left-auto md:right-8 z-40 p-4 rounded-full bg-black/10 hover:bg-red-600/60 text-white transition-all hidden md:block group">
              <span className="text-3xl block group-hover:translate-x-1 transition-transform">❯</span>
            </button>

            <div className="relative z-10 p-6 max-w-5xl mx-auto flex flex-col items-center mt-12 w-full">
              {featuredEvents.map((event, index) => (
                <div key={event.id} className={`transition-all duration-700 absolute w-full flex flex-col items-center ${index === currentSlide ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-8 absolute pointer-events-none'}`}>
                  <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter text-white mb-6 leading-tight drop-shadow-lg">{event.title}</h1>
                  <p className="text-sm sm:text-base md:text-xl text-slate-200 mb-10 max-w-2xl drop-shadow-md">{event.description}</p>
                  <Link href={event.link}><button className="rounded-full bg-red-600 hover:bg-red-700 px-10 py-4 text-sm md:text-lg font-extrabold text-white transition-all hover:scale-105 shadow-2xl hover:shadow-red-600/50">Lihat Karya Pameran</button></Link>
                </div>
              ))}
            </div>

            <div className="absolute bottom-12 flex gap-4 z-30">
              {featuredEvents.map((_, index) => (
                <button 
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${index === currentSlide ? 'w-16 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'w-4 bg-white/30 hover:bg-white/60'}`}
                  aria-label={`Ke slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          <h2 className="z-10 text-2xl font-bold text-slate-400">Belum ada acara pameran yang aktif.</h2>
        )}
      </section>

      {/* =========================================
          DAFTAR SEMUA ACARA
          ========================================= */}
      <section id="semua-acara" className="w-full max-w-7xl mx-auto p-6 py-16 md:p-16 md:py-24 flex-grow">
        <div className="mb-12">
          <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight text-center md:text-left">Jelajahi Pameran</h2>
          <div className="h-1.5 w-20 bg-red-600 mt-4 mx-auto md:mx-0 rounded-full"></div>
        </div>
        
        {allEvents.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-10 w-full">
            {allEvents.map(event => (
              <EventCard 
                key={event.id} 
                title={event.title} 
                category={event.category} 
                image={event.image} 
                href={event.link} 
                waktu={event.waktu}   
                tempat={event.tempat}  
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 font-medium">Belum ada acara yang tersedia saat ini.</p>
        )}
      </section>
      
      {/* Footer Minimalis */}
      <footer className="w-full bg-slate-950 text-slate-400 py-10 text-center mt-auto border-t border-slate-900">
        <p className="text-sm font-medium tracking-wide">&copy; 2026 UKM FOTOGRAFI TELKOM UNIVERSITY. ALL RIGHTS RESERVED.</p>
        <Link href="/admin" className="inline-block mt-4 text-[10px] uppercase tracking-[0.2em] text-slate-800 hover:text-red-600 transition-all font-bold">
          Administrator Portal
        </Link>
      </footer>
    </main>
  );
}