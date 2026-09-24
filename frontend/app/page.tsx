"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ScrollReveal } from './components/ScrollReveal';
import { EventCard } from './components/EventCard';
import { GalleryCard } from './components/GalleryCard';
import { ServiceGrid } from './components/ServiceGrid';
import { ArrowRightToLine } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/app/components/ui/scroll-area';
import type { Acara, Koleksi, KoleksiOrigin } from './components/types';
import { fetchGalleryData, fetchEventsData } from './lib/api';

// --- DATA PLACEHOLDER KOLEKSI (dinonaktifkan — data diambil dari backend) ---
// const KOLEKSI_DATA = [
//   { id: 1, title: "Urban Solitude", photographer: "Budi Santoso", category: "Street", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800", span: "md:col-span-1 md:row-span-2", description: "...", exif: "..." },
//   ... (12 items mockup dihapus, data diambil dari backend)
// ];

// --- DATA PLACEHOLDER ACARA (dinonaktifkan — data diambil dari backend) ---
// const MOCK_EVENTS: Acara[] = [ ... ];

// --- DATA MEDIA PARTNER (dikosongkan sementara, uncomment saat data siap) ---
// const CAROUSEL_PARTNERS = [
//   {
//     id: "partner-1",
//     label: "Ruang kolaborasi UFT",
//     title: "Media Partner 01",
//     description: "Tempat untuk memperkenalkan media partner yang mendukung cerita dan kegiatan fotografi UFT.",
//     image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600",
//   },
//   {
//     id: "partner-2",
//     label: "Dukungan program",
//     title: "Sponsor Utama",
//     description: "Sorotan untuk sponsor yang membantu menghadirkan kelas, pameran, dan kegiatan terbaru UFT.",
//     image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1600",
//   },
//   {
//     id: "partner-3",
//     label: "Kolaborasi kreatif",
//     title: "Partner Kreatif",
//     description: "Ruang untuk mitra kreatif yang tumbuh bersama UFT melalui proyek dan pengalaman visual.",
//     image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600",
//   },
// ];
const CAROUSEL_PARTNERS: { id: string; label: string; title: string; description: string; image: string }[] = [];

const SERVICES = [
  { title: 'Kelas Fotografi', description: 'Belajar teknik kamera, cahaya, komposisi, dan proses kreatif bersama anggota.' },
  { title: 'Hunting Foto', description: 'Membaca ruang dan cerita kota melalui praktik memotret di berbagai lokasi.' },
  { title: 'Pameran Karya', description: 'Membawa karya anggota ke ruang publik dan merayakan proses di baliknya.' },
  { title: 'Kolaborasi', description: 'Bekerja lintas minat untuk menghasilkan dokumentasi dan proyek visual yang bermakna.' },
];

const NAV_ITEMS = [
  { label: 'Beranda', sectionId: 'home', targetId: 'home' },
  { label: 'Tentang', sectionId: 'tentang', targetId: 'tentang' },
  { label: 'Galeri', sectionId: 'galeri-lengkap', targetId: 'galeri-lengkap' },
  { label: 'Acara', sectionId: 'acara', targetId: 'acara-lengkap' },
];

const eventDetailHref = (event: Acara) => {
  const params = new URLSearchParams({
    title: event.title,
    description: event.description,
    waktu: event.waktu,
    tempat: event.tempat,
    image: event.image,
  });
  return `/acara/${event.id}?${params.toString()}`;
};

export default function LandingPage() {
  const [events, setEvents] = useState<Acara[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [koleksiData, setKoleksiData] = useState<Koleksi[]>([]);
  const [isLoadingGaleri, setIsLoadingGaleri] = useState(true);
  const [galeriError, setGaleriError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<Acara | null>(null);
  const [selectedKoleksi, setSelectedKoleksi] = useState<Koleksi | null>(null);
  const [isKoleksiDetailOpen, setIsKoleksiDetailOpen] = useState(false);
  const [koleksiOrigin, setKoleksiOrigin] = useState<KoleksiOrigin | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const isNavigatingRef = useRef(false);
  const navigationTimerRef = useRef<number | null>(null);

  const scrollToSection = (sectionId: string) => {
    if (navigationTimerRef.current) {
      window.clearTimeout(navigationTimerRef.current);
    }

    isNavigatingRef.current = true;
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsMobileMenuOpen(false);
    navigationTimerRef.current = window.setTimeout(() => {
      isNavigatingRef.current = false;
    }, 850);
  };

  useEffect(() => {
    let animationFrame = 0;
    const sectionTargets = [
      { sectionId: 'home', navId: 'home' },
      { sectionId: 'tentang', navId: 'tentang' },
      { sectionId: 'galeri-lengkap', navId: 'galeri-lengkap' },
      { sectionId: 'acara-lengkap', navId: 'acara' },
    ];

    const updateActiveSection = () => {
      if (isNavigatingRef.current) {
        animationFrame = 0;
        return;
      }

      const marker = window.innerWidth >= 640 ? 88 : 72;
      let currentSection = 'home';

      for (const target of sectionTargets) {
        const section = document.getElementById(target.sectionId);
        if (!section) continue;

        const { top } = section.getBoundingClientRect();
        if (top <= marker) {
          currentSection = target.navId;
        }
      }

      setActiveSection((current) => current === currentSection ? current : currentSection);
      animationFrame = 0;
    };

    const handleViewportChange = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateActiveSection);
      }
    };

    const scrollViewport = document.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    updateActiveSection();
    scrollViewport?.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      scrollViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (navigationTimerRef.current) window.clearTimeout(navigationTimerRef.current);
    };
  }, []);

  const openKoleksiDetail = (item: Koleksi, event: React.MouseEvent<HTMLButtonElement>) => {
    const originElement = event.currentTarget.querySelector<HTMLElement>('[data-koleksi-image]') ?? event.currentTarget;
    const bounds = originElement.getBoundingClientRect();
    setKoleksiOrigin({ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height });
    setSelectedKoleksi(item);
    requestAnimationFrame(() => setIsKoleksiDetailOpen(true));
  };

  const closeKoleksiDetail = () => {
    setIsKoleksiDetailOpen(false);
    window.setTimeout(() => {
      setSelectedKoleksi(null);
      setKoleksiOrigin(null);
    }, 550);
  };

  // Kunci scroll body saat modal terbuka
  useEffect(() => {
    if (selectedEvent || selectedKoleksi) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [selectedEvent, selectedKoleksi]);

  useEffect(() => {
    if (CAROUSEL_PARTNERS.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const carouselTimer = window.setInterval(() => {
      setHighlightIndex((current) => (current === CAROUSEL_PARTNERS.length - 1 ? 0 : current + 1));
    }, 6000);

    return () => window.clearInterval(carouselTimer);
  }, []);

  // Fetch gallery data from backend
  useEffect(() => {
    let cancelled = false;

    fetchGalleryData()
      .then((data) => {
        if (!cancelled) setKoleksiData(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Gagal memuat galeri:', err);
          setGaleriError(err instanceof Error ? err.message : 'Gagal memuat galeri dari server.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGaleri(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Fetch events data from backend
  useEffect(() => {
    let cancelled = false;

    fetchEventsData()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Gagal memuat acara:', err);
          setEventsError(err instanceof Error ? err.message : 'Gagal memuat daftar acara dari server.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEvents(false);
      });

    return () => { cancelled = true; };
  }, []);

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const koleksiImageStyle = isKoleksiDetailOpen || !koleksiOrigin
    ? {
        top: 0,
        left: 0,
        width: viewportWidth,
        height: viewportHeight,
      }
    : koleksiOrigin;
  const visibleEvents = events.slice(0, 10);
  const remainingEvents = events.slice(10);
  
  

  return (
    <div className="h-screen overflow-hidden bg-white font-sans text-slate-900 selection:bg-red-600 selection:text-white">
      {/* --- 1. NAVBAR / HEADER (#home) --- */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/75 text-slate-950 backdrop-blur-sm">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:px-8">
          <button type="button" onClick={() => scrollToSection('home')} className="flex min-w-0 items-center outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent" aria-label="Kembali ke beranda">
            <Image src="/logo-uft.png" alt="Logo UFT" width={100} height={32} className="h-7 w-auto sm:h-8" priority unoptimized />
          </button>

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex lg:gap-10">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => scrollToSection(item.targetId)}
                className={`relative px-1 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-950 ${activeSection === item.sectionId ? 'text-slate-950 after:absolute after:inset-x-1 after:-bottom-1 after:h-px after:bg-slate-950' : 'text-slate-700 hover:text-slate-950'}`}
                aria-current={activeSection === item.sectionId ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center border border-slate-950/30 text-slate-950 outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-slate-950 md:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          >
            <span className="sr-only">Menu</span>
            <span className="relative h-5 w-5" aria-hidden="true">
              <span className={`absolute left-0 top-1/2 h-px w-full bg-current transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-45' : '-translate-y-1.5'}`} />
              <span className={`absolute left-0 top-1/2 h-px w-full bg-current transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 top-1/2 h-px w-full bg-current transition-transform duration-200 ${isMobileMenuOpen ? '-rotate-45' : 'translate-y-1.5'}`} />
            </span>
          </button>
        </div>

        <div id="mobile-navigation" className={`${isMobileMenuOpen ? 'block' : 'hidden'} border-t border-slate-200 bg-white/95 px-4 py-3 text-slate-950 backdrop-blur-md md:hidden`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => scrollToSection(item.targetId)}
                className={`border-b border-slate-100 px-2 py-3 text-left text-sm font-semibold transition-colors last:border-b-0 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 ${activeSection === item.sectionId ? 'text-slate-950' : 'text-slate-700'}`}
                aria-current={activeSection === item.sectionId ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* --- MOBILE BOTTOM NAV DOCK --- */}
      <ScrollArea className="h-screen">
        <main className="flex flex-col">
        {/* Sorotan acara ditempatkan lebih dulu agar pengunjung melihat kegiatan terkini sebelum mengenal komunitas. */}
        <section id="home" className="px-4 pb-4 pt-20 sm:px-6 sm:pb-5 sm:pt-24 md:pb-8">
          <div className="mx-auto max-w-7xl">
            {CAROUSEL_PARTNERS.length > 0 ? (
              <div className="relative min-h-[360px] overflow-hidden bg-stone-900 sm:min-h-[410px] md:min-h-[480px]">
                {CAROUSEL_PARTNERS.map((partner, index) => (
                  <div
                    key={partner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === highlightIndex ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden={index !== highlightIndex}
                  >
                    <Image
                      src={partner.image}
                      alt={index === highlightIndex ? partner.title : ''}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      unoptimized
                    />
                  </div>
                ))}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent px-4 pb-12 pt-24 text-white sm:px-8 sm:pb-14">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200 sm:text-sm">{CAROUSEL_PARTNERS[highlightIndex].label}</p>
                  <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[0.95] sm:text-6xl md:text-7xl">{CAROUSEL_PARTNERS[highlightIndex].title}</h1>
                  <p className="mt-5 max-w-xl text-sm text-slate-100 sm:text-base">{CAROUSEL_PARTNERS[highlightIndex].description}</p>
                </div>
                <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
                  {CAROUSEL_PARTNERS.map((partner, index) => (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => setHighlightIndex(index)}
                      className={`h-2.5 w-2.5 rounded-full border border-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${index === highlightIndex ? 'bg-white' : 'bg-transparent hover:bg-white/60'}`}
                      aria-label={`Tampilkan sorotan ${index + 1}: ${partner.title}`}
                      aria-current={index === highlightIndex ? 'true' : undefined}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center bg-stone-100 p-8 text-center gap-2">
                <p className="text-base font-semibold text-slate-700">Belum ada Media Partner / Sponsor</p>
                <p className="text-sm text-slate-500">Info kerja sama akan ditampilkan di sini.</p>
              </div>
            )}
          </div>
        </section>

        <section id="tentang" className="border-y border-stone-200 bg-stone-50 px-4 py-10 sm:px-6 sm:py-12 md:py-16">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <ScrollReveal>
            <div className="flex flex-col">
              <p className="mb-4 text-sm font-semibold text-red-700">Tentang Kami</p>
              <h2 className="text-4xl font-extrabold leading-[0.95] text-slate-950 sm:text-5xl md:text-6xl">
                Welcome to UFT
              </h2>
              <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700 sm:mt-8 sm:space-y-6 sm:text-lg">
                <p>
                  Unit Kegiatan Mahasiswa Fotografi Telkom University adalah komunitas resmi bagi mahasiswa yang memiliki ketertarikan pada seni dan teknik fotografi.
                </p>
                <p>
                  Kami memfasilitasi anggota untuk   memahami teknik pencahayaan, komposisi, hingga proses pascaproduksi. Mulai dari pameran karya tahunan hingga dokumentasi kegiatan, UFT menyediakan lingkungan belajar yang terstruktur bagi setiap tingkatan keahlian.
                </p>
              </div>
            </div>
            </ScrollReveal>
            
            <ScrollReveal delay={120}>
            <div className="relative mx-auto flex aspect-[4/3] w-full max-w-lg items-center justify-center overflow-hidden bg-stone-100 p-8 sm:p-12 lg:max-w-none">
              <Image 
                src="/logo-uft.png"
                alt="Logo UFT"
                width={280}
                height={90}
                className="h-auto w-[58%] max-w-[240px] object-contain sm:w-[52%] sm:max-w-[280px]"
                unoptimized
              />
            </div>
            </ScrollReveal>
          </div>
        </section>

        <section id="layanan" className="border-b border-stone-200 bg-white px-4 py-10 sm:px-6 sm:py-12 md:py-16">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-red-700">Yang kami lakukan</p>
                  <h2 className="max-w-xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl md:text-5xl">Belajar lewat proses yang nyata.</h2>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-slate-600 sm:text-right">Dari kamera pertama hingga karya yang siap dipamerkan, UFT tumbuh melalui praktik dan percakapan.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <ServiceGrid services={SERVICES} />
            </ScrollReveal>
          </div>
        </section>

        {/* --- 3. GALLERY GRID "COLLECTIONS" (#koleksi) --- */}
        <section id="koleksi" className="border-t border-stone-200 bg-stone-50 px-4 py-10 sm:px-6 sm:py-12 md:py-16">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
            <div className="flex flex-col justify-between gap-5 mb-8 md:flex-row md:items-end sm:mb-10">
              <div>
              <h2 className="mb-4 text-3xl font-extrabold text-slate-950 sm:text-4xl md:text-5xl">Karya Pilihan</h2>
              </div>
              
            </div>
            </ScrollReveal>

            {isLoadingGaleri ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[5/4] bg-stone-200" />
                    <div className="pt-3 space-y-2">
                      <div className="h-3 w-16 bg-stone-200 rounded" />
                      <div className="h-5 w-3/4 bg-stone-200 rounded" />
                      <div className="h-3 w-1/2 bg-stone-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : galeriError ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-red-600">Gagal Memuat Galeri</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500">{galeriError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 border border-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white"
                >
                  Coba Lagi
                </button>
              </div>
            ) : koleksiData.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-10 text-center">
                <p className="text-lg font-bold text-slate-950">Belum Ada Karya</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500">Galeri karya anggota akan ditampilkan di sini setelah diupload melalui dashboard admin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {koleksiData.slice(0, 3).map((item) => (
                  <ScrollReveal key={item.id} delay={Math.min(item.id * 80, 400)}>
                    <GalleryCard item={item} onSelect={openKoleksiDetail} featured />
                  </ScrollReveal>
                ))}
              </div>
            )}
            {!isLoadingGaleri && !galeriError && koleksiData.length > 3 && (
            <div className="mt-10">
              <button type="button" onClick={() => scrollToSection('galeri-lengkap')} className="inline-flex border border-slate-950 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4">
                Lihat galeri lengkap
              </button>
            </div>
            )}
          </div>
        </section>

        {/* --- 4. EVENTS HORIZONTAL SLIDER (#acara) --- */}
        <section id="acara" className="border-t border-stone-200 bg-white px-4 py-10 sm:px-6 sm:py-12 md:py-16">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
            <div className="mb-8 sm:mb-10">
              <h2 className="mb-4 text-3xl font-extrabold text-slate-950 sm:text-4xl md:text-5xl">Events</h2>
              <p className="max-w-xl text-base text-slate-600 sm:text-lg">Geser untuk melihat pameran, lokakarya, dan hunting</p>
            </div>
            </ScrollReveal>

            <div className="relative">
              {isLoadingEvents ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-[3/2] bg-stone-100 flex items-center justify-center border border-stone-200">
                      <span className="text-slate-500 font-medium text-sm">Memuat jadwal...</span>
                    </div>
                  ))}
                </div>
              ) : eventsError ? (
                <div className="w-full p-8 rounded-2xl bg-stone-50 border border-stone-200 text-center flex flex-col items-center">
                  <p className="text-slate-700 mb-4">{eventsError}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-full font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    Muat Ulang
                  </button>
                </div>
              ) : events.length === 0 ? (
                <div className="w-full p-12 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                  <h3 className="text-xl font-bold text-slate-950 mb-2">Belum Ada Agenda Terjadwal</h3>
                  <p className="text-slate-600">Jadwal acara terbaru akan diperbarui pada halaman ini.</p>
                </div>
              ) : (
                <ScrollReveal>
                  <ScrollArea className="-mx-4 h-[450px] px-4 sm:-mx-6 sm:h-[470px] sm:px-6 md:mx-0 md:h-[480px] md:px-0">
                    <div className="flex min-w-max gap-4 pb-4 sm:gap-5">
                      {visibleEvents.map((event) => (
                        <EventCard key={event.id} event={event} onSelect={setSelectedEvent} href={eventDetailHref(event)} />
                      ))}
                      {remainingEvents.length > 0 && (
                        <div className="flex w-[220px] shrink-0 items-center justify-center">
                          <button
                            type="button"
                            onClick={() => document.getElementById('acara-lengkap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="group flex flex-col items-center gap-2 px-5 py-3 text-center text-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4"
                            aria-label="Lihat selengkapnya"
                          >
                            <ArrowRightToLine aria-hidden="true" className="h-10 w-10 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.5} />
                            <span className="text-sm font-semibold">Lihat selengkapnya</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </ScrollReveal>
              )}
            </div>
          </div>
        </section>

      
        {/* --- MODAL DETAIL KOLEKSI --- */}
        {selectedKoleksi && (
          <div
            className="fixed inset-0 z-[100] bg-black"
            role="dialog"
            aria-modal="true"
            aria-label={`Detail karya ${selectedKoleksi.title}`}
          >
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-500 motion-reduce:transition-none ${isKoleksiDetailOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={closeKoleksiDetail}
            />

            <div
              className="absolute z-10 overflow-hidden bg-black transition-[top,left,width,height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={koleksiImageStyle}
            >
              <Image
                src={selectedKoleksi.image}
                alt=""
                fill
                aria-hidden="true"
                className="scale-110 object-cover opacity-45 blur-2xl"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
              <Image
                src={selectedKoleksi.image}
                alt={selectedKoleksi.title}
                fill
                className="relative z-10 object-contain"
                unoptimized
              />
            </div>

            <div
              className={`pointer-events-none absolute inset-x-0 top-0 z-20 max-h-[75vh] overflow-y-auto px-4 pb-16 pt-6 text-white transition-opacity duration-500 delay-200 motion-reduce:transition-none sm:px-8 sm:pb-24 sm:pt-8 md:px-10 md:pt-10 ${isKoleksiDetailOpen ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="absolute inset-x-0 top-0 -z-10 h-full min-h-72 bg-gradient-to-b from-black/80 via-black/35 to-transparent" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-300 sm:text-xs">
                {selectedKoleksi.category}
              </p>
              <h3 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight sm:mt-3 sm:text-4xl md:text-5xl">
                {selectedKoleksi.title}
              </h3>
              <p className="mt-2 text-xs font-medium text-stone-200 sm:mt-3 sm:text-base">
                Karya oleh <span className="text-white">{selectedKoleksi.photographer}</span>
              </p>
              {selectedKoleksi.description && (
                <p className="mt-4 max-w-2xl text-xs leading-relaxed text-stone-200 sm:mt-6 sm:text-base">
                  {selectedKoleksi.description}
                </p>
              )}
              {selectedKoleksi.exif && (
                <p className="mt-3 max-w-2xl break-words font-mono text-[10px] text-stone-400 sm:mt-4 sm:text-sm">
                  {selectedKoleksi.exif}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={closeKoleksiDetail}
              className="absolute right-5 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label="Tutup detail"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        {/* --- MODAL DETAIL ACARA --- */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-6 md:p-12">
            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
            <div className="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                aria-label="Tutup detail"
              >
                <span aria-hidden="true">×</span>
              </button>
              
              <div className="relative w-full aspect-[21/9] bg-stone-100">
                <Image 
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  fill
                  className="object-cover opacity-80 mix-blend-luminosity"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
              </div>
              
              <div className="relative z-10 -mt-12 flex flex-col rounded-t-2xl bg-white p-5 sm:-mt-16 sm:rounded-t-3xl sm:p-8">
                {selectedEvent.status && (
                  <span className="self-start px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full mb-4 uppercase tracking-widest shadow-lg">
                    {selectedEvent.status}
                  </span>
                )}
                <h3 className="mb-5 text-2xl font-extrabold leading-tight text-slate-950 sm:mb-6 sm:text-4xl">{selectedEvent.title}</h3>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-8 pb-8 border-b border-stone-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tanggal & Waktu</span>
                    <span className="text-slate-800 font-medium">{selectedEvent.waktu}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lokasi Acara</span>
                    <span className="text-slate-800 font-medium">{selectedEvent.tempat}</span>
                  </div>
                </div>
                
                <div className="text-slate-700 leading-relaxed mb-10 space-y-4">
                  <p>{selectedEvent.description}</p>
                  <p>Acara ini terbuka bagi seluruh anggota UFT maupun mahasiswa Telkom University secara umum. Pastikan Anda mendaftar melalui portal anggota sebelum kuota penuh.</p>
                </div>
                
                <a href="mailto:halo@uft.telkomuniversity.ac.id" onClick={() => setSelectedEvent(null)} className="w-full py-4 text-center bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-red-500">
                  Hubungi Panitia
                </a>
              </div>
            </div>
          </div>
        )}

        <section id="galeri-lengkap" className="border-t border-stone-200 bg-stone-50 px-4 py-10 sm:px-6 sm:py-12 md:py-16">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="mb-8 max-w-2xl sm:mb-10">
                <h2 className="text-3xl font-extrabold text-slate-950 sm:text-4xl md:text-5xl">Gallery</h2>
                <p className="mt-4 text-base text-slate-600 sm:text-lg">Karya anggota UFT dalam berbagai pendekatan visual.</p>
              </div>
            </ScrollReveal>
            {isLoadingGaleri ? (
              <div className="mx-auto max-w-6xl columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="mb-4 break-inside-avoid animate-pulse">
                    <div className="bg-stone-200" style={{ height: `${150 + (i % 3) * 80}px` }} />
                  </div>
                ))}
              </div>
            ) : galeriError ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-12 text-center">
                <p className="text-sm font-semibold text-red-600">Gagal Memuat Galeri</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500">{galeriError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 border border-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white"
                >
                  Coba Lagi
                </button>
              </div>
            ) : koleksiData.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-12 text-center">
                <p className="text-lg font-bold text-slate-950">Belum Ada Karya</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500">Galeri karya anggota akan ditampilkan di sini setelah diupload melalui dashboard admin.</p>
              </div>
            ) : (
              <div className="mx-auto max-w-6xl columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
                {koleksiData.map((item, index) => (
                  <ScrollReveal key={item.id} delay={Math.min(index * 70, 350)}>
                    <GalleryCard item={item} onSelect={openKoleksiDetail} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {events.length > 0 && (
          <section id="acara-lengkap" className="border-t border-stone-200 bg-white px-4 py-10 sm:px-6 sm:py-12 md:py-16">
            <div className="mx-auto max-w-7xl">
              <ScrollReveal>
                <div className="mb-8 max-w-2xl sm:mb-10">
                  <h2 className="text-3xl font-extrabold text-slate-950 sm:text-4xl md:text-5xl">Events</h2>
                </div>
              </ScrollReveal>
              <div className="grid grid-cols-3 items-stretch gap-3 sm:gap-6">
                {events.map((event, index) => (
                  <ScrollReveal key={event.id} delay={Math.min(index * 70, 350)} className="h-full">
                    <EventCard event={event} onSelect={setSelectedEvent} compact href={eventDetailHref(event)} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )}
        </main>

      {/* --- 5. FOOTER (#kontak) --- */}
        <footer id="kontak" className="mt-10 border-t border-slate-800 bg-slate-950 px-4 pb-8 pt-8 text-white sm:mt-14 sm:px-6 sm:pb-10 sm:pt-10">
        <div className="mx-auto mb-8 grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6">
            <div className="flex items-start gap-6 sm:gap-8">
              <Image src="/logo-uft.png" alt="Logo UFT" width={100} height={34} className="w-24 shrink-0 opacity-90 sm:w-28" unoptimized />
              <div className="min-w-0">
                <address className="mt-4 text-sm not-italic leading-relaxed text-slate-300">
                  EB.01.08 Telkom University,<br />
                  Bandung, Jawa Barat.
                </address>
              </div>
            </div>
          </div>
          <div className="md:col-span-3">
            <h4 className="mb-5 font-bold text-white">Hubungi UFT</h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li><a href="mailto:ukmfotografitelkom2022@gmail.com" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">ukmfotografitelkom2022@gmail.com</a></li>
              <li><a href="https://wa.me/6282124792449" target="_blank" rel="noopener noreferrer" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">082124792449 (Ysel)</a></li>
              <li><a href="https://wa.me/6282111143392" target="_blank" rel="noopener noreferrer" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">082111143392 (Amany)</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-3">
            <h4 className="mb-5 font-bold text-white">Ikuti UFT</h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li><a href="https://www.instagram.com/fotografitelkom/" target="_blank" rel="noopener noreferrer" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">Instagram</a></li>
              <li><a href="https://www.tiktok.com/@fotografi.telkom" target="_blank" rel="noopener noreferrer" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">TikTok</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mx-auto flex max-w-7xl items-center border-t border-slate-800 pt-6 text-xs leading-relaxed text-slate-400 sm:text-sm">
          <p>&copy; {new Date().getFullYear()} UKM Fotografi Telkom University. All rights reserved.</p>
        </div>
        </footer>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
