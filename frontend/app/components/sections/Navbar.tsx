"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const NAV_ITEMS = [
  { label: 'Beranda', sectionId: 'home', targetId: 'home' },
  { label: 'Tentang', sectionId: 'tentang', targetId: 'tentang' },
  { label: 'Galeri', sectionId: 'galeri-lengkap', targetId: 'galeri-lengkap' },
  { label: 'Acara', sectionId: 'acara', targetId: 'acara-lengkap' },
];

/**
 * Self-contained Navbar with its own scroll-tracking and mobile-menu state.
 * Isolates `activeSection` and `isMobileMenuOpen` from the rest of the page
 * so that scroll/menu interactions never cause gallery or event re-renders.
 */
export function Navbar() {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  return (
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
  );
}
