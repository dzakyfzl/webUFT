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

// --- DATA PLACEHOLDER KOLEKSI ---
const KOLEKSI_DATA = [
  { id: 1, title: "Urban Solitude", photographer: "Budi Santoso", category: "Street", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800", span: "md:col-span-1 md:row-span-2", description: "Diambil pada sudut jalan Braga di pagi buta. Kesunyian kota direkam sebelum hiruk pikuk dimulai.", exif: "Sony A7III / 50mm / f/1.8 / 1/200s / ISO 100" },
  { id: 2, title: "Neon Nights", photographer: "Siti Aminah", category: "Night", image: "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?q=80&w=800", span: "md:col-span-2 md:row-span-1", description: "Binar lampu neon pasar malam memantulkan cerita masyarakat urban yang tak pernah tidur.", exif: "Fujifilm X-T4 / 35mm / f/2.0 / 1/60s / ISO 800" },
  { id: 3, title: "Silent Peaks", photographer: "Andi Wijaya", category: "Landscape", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800", span: "md:col-span-1 md:row-span-1", description: "Keheningan alam Pegunungan Bromo di saat fajar menyingsing memberikan ketenangan batin yang absolut.", exif: "Canon EOS R5 / 24mm / f/8.0 / 1/100s / ISO 200" },
  { id: 4, title: "Stage Echoes", photographer: "Rina Sari", category: "Stage", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800", span: "md:col-span-1 md:row-span-1", description: "Keheningan alam Pegunungan Bromo di saat fajar menyingsing memberikan ketenangan batin yang absolut.", exif: "Canon EOS R5 / 24mm / f/8.0 / 1/100s / ISO 200" },
  { id: 5, title: "Eyes of the City", photographer: "Reza Pahlevi", category: "Portrait", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800", span: "md:col-span-2 md:row-span-2", description: "Menatap tajam, sebuah potret kedalaman emosi penduduk lokal di tengah derasnya modernisasi.", exif: "Sony A7RIV / 85mm / f/1.2 / 1/250s / ISO 100" },
  { id: 6, title: "[Mockup] Morning Frame", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800", span: "md:col-span-1 md:row-span-1", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
  { id: 7, title: "[Mockup] In Between", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=800", span: "md:col-span-1 md:row-span-2", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
  { id: 8, title: "[Mockup] Quiet Motion", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800", span: "md:col-span-2 md:row-span-1", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
  { id: 9, title: "[Mockup] Concrete Light", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800", span: "md:col-span-1 md:row-span-1", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
  { id: 10, title: "[Mockup] Late Afternoon", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=800", span: "md:col-span-2 md:row-span-2", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
  { id: 11, title: "[Mockup] Passing Through", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=800", span: "md:col-span-1 md:row-span-1", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
  { id: 12, title: "[Mockup] Blue Hour", photographer: "[Nama fotografer]", category: "Mockup", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800", span: "md:col-span-1 md:row-span-2", description: "Placeholder karya untuk pengujian tata letak galeri.", exif: "[DATA EXIF]" },
];

// --- DATA PLACEHOLDER ACARA ---
const MOCK_EVENTS: Acara[] = [
  {
    id: "evt-1",
    title: "Pameran Karya Tahunan: Lensa Kita",
    description: "Pameran fotografi terbesar dari seluruh anggota aktif UFT tahun ini.",
    waktu: "15 Agustus 2026",
    tempat: "Galeri Ideal, Bandung",
    image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=800",
    link: "#koleksi",
    status: "Mendatang"
  },

  {
    id: "evt-3",
    title: "Street Photography Hunting",
    description: "Hunting bersama menyusuri jalanan bersejarah Braga.",
    waktu: "25 September 2026",
    tempat: "Jalan Braga, Bandung",
    image: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=800",
    link: "#koleksi",
    status: "Aktif"
  },
  {
    id: "mock-event-1",
    title: "[Mockup] Diskusi Fotografi Dokumenter",
    description: "Placeholder untuk acara diskusi yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-2",
    title: "[Mockup] Kelas Penyuntingan Foto",
    description: "Placeholder untuk kelas teknis yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-3",
    title: "[Mockup] Pameran Kolaborasi Kampus",
    description: "Placeholder untuk pameran yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-4",
    title: "[Mockup] Hunting Foto Kota",
    description: "Placeholder untuk agenda hunting yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-5",
    title: "[Mockup] Bedah Portofolio Anggota",
    description: "Placeholder untuk sesi ulasan karya yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-6",
    title: "[Mockup] Pameran Karya Anggota Baru",
    description: "Placeholder untuk pameran internal yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-7",
    title: "[Mockup] Kelas Cetak Foto",
    description: "Placeholder untuk kelas produksi yang akan diisi dari data resmi.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-8",
    title: "[Mockup] Praktik Fotografi Malam",
    description: "Placeholder untuk sesi praktik memotret dengan pencahayaan malam.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-9",
    title: "[Mockup] Diskusi Visual Storytelling",
    description: "Placeholder untuk diskusi tentang membangun cerita melalui rangkaian foto.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  },
  {
    id: "mock-event-10",
    title: "[Mockup] Sesi Review Karya",
    description: "Placeholder untuk sesi review dan masukan portofolio anggota.",
    waktu: "[Tanggal acara]",
    tempat: "[Lokasi acara]",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800",
    link: "#acara",
    status: "Mockup"
  }
];

const CAROUSEL_PARTNERS = [
  {
    id: "partner-1",
    label: "Ruang kolaborasi UFT",
    title: "Media Partner 01",
    description: "Tempat untuk memperkenalkan media partner yang mendukung cerita dan kegiatan fotografi UFT.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600",
  },
  {
    id: "partner-2",
    label: "Dukungan program",
    title: "Sponsor Utama",
    description: "Sorotan untuk sponsor yang membantu menghadirkan kelas, pameran, dan kegiatan terbaru UFT.",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1600",
  },
  {
    id: "partner-3",
    label: "Kolaborasi kreatif",
    title: "Partner Kreatif",
    description: "Ruang untuk mitra kreatif yang tumbuh bersama UFT melalui proyek dan pengalaman visual.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600",
  },
];

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
  const [events, setEvents] = useState<Acara[]>(MOCK_EVENTS);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);

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
              <div className="flex min-h-[360px] items-center justify-center bg-stone-100 p-8 text-center">
                <p className="text-slate-600">Belum ada acara untuk ditampilkan.</p>
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

            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {KOLEKSI_DATA.slice(0, 3).map((item) => (
                <ScrollReveal key={item.id} delay={Math.min(item.id * 80, 400)}>
                  <GalleryCard item={item} onSelect={openKoleksiDetail} featured />
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-10">
              <button type="button" onClick={() => scrollToSection('galeri-lengkap')} className="inline-flex border border-slate-950 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4">
                Lihat galeri lengkap
              </button>
            </div>
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
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-stone-200 sm:mt-6 sm:text-base">
                {selectedKoleksi.description}
              </p>
              <p className="mt-3 max-w-2xl break-words font-mono text-[10px] text-stone-400 sm:mt-4 sm:text-sm">
                {selectedKoleksi.exif}
              </p>
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
            <div className="mx-auto max-w-6xl columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
              {KOLEKSI_DATA.map((item, index) => (
                <ScrollReveal key={item.id} delay={Math.min(index * 70, 350)}>
                  <GalleryCard item={item} onSelect={openKoleksiDetail} />
                </ScrollReveal>
              ))}
            </div>
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
                  Gedung Student Center,<br />
                  Kampus Telkom University,<br />
                  Bandung, Jawa Barat.
                </address>
              </div>
            </div>
          </div>
          <div className="md:col-span-3">
            <h4 className="mb-5 font-bold text-white">Hubungi UFT</h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li><a href="mailto:halo@uft.telkomuniversity.ac.id" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">halo@uft.telkomuniversity.ac.id</a></li>
              <li><a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="text-slate-300 transition-colors hover:text-white focus-visible:text-red-400 focus-visible:underline">WhatsApp Humas UFT</a></li>
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
